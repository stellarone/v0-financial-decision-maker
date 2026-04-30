import "server-only"

import { AcumaticaClient } from "@/lib/clients/acumatica-client"
import { AcumaticaError } from "@/lib/clients/errors"
import type { AcumaticaARInvoice } from "@/lib/clients/types"

const DEFAULT_PLATFORM_ACUMATICA_URL = "https://acumatica.stellarone.ai"
const SOURCE_APP = "finance"
const LOG_PREFIX = "[acumatica-calendar][ar-invoices]"
const TARGET_MONTH_START = "2026-02-01"
const TARGET_MONTH_END = "2026-03-31"

export interface CalendarInflowSeed {
  id: string
  dateISO: string
  entityName: string
  entityId: string
  reference: string
  amount: number
}

interface InvoiceLogContext {
  type: string | null
  reference: string | null
  customerCode: string | null
  customerName: string | null
  customerId: string | null
  dueDate: string | null
  invoiceDate: string | null
  docDate: string | null
  amount: number | null
  balance: number | null
}

interface InvoiceMappingResult {
  inflow: CalendarInflowSeed | null
  skippedReason: string | null
  context: InvoiceLogContext
  dateSource: "dueDate" | "invoiceDate" | "docDate" | null
}

interface AcumaticaCustomerRow {
  CustomerID?: { value: string }
  CustomerName?: { value: string }
}

function readRequiredEnv(name: "PLATFORM_ACUMATICA_SERVICE_TOKEN") {
  const value = process.env[name]
  if (!value) {
    console.warn(`[acumatica-calendar] Missing ${name}; falling back to mock inflows`)
    return null
  }
  return value
}

function readOptionalEnv(name: "PLATFORM_ACUMATICA_URL") {
  return process.env[name] ?? DEFAULT_PLATFORM_ACUMATICA_URL
}

function unwrapString(value: { value: string } | undefined) {
  if (!value?.value) return null
  return value.value
}

function unwrapNumber(value: { value: number } | undefined) {
  if (typeof value?.value !== "number" || Number.isNaN(value.value)) return null
  return value.value
}

function orgIdPreview(organizationId: string) {
  if (organizationId.length <= 12) return organizationId
  return `${organizationId.slice(0, 8)}...${organizationId.slice(-4)}`
}

function toDateISO(rawDate: string | null) {
  if (!rawDate) return null
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function normalizeAcumaticaBaseUrl(baseUrl: string) {
  if (/^https?:\/\//i.test(baseUrl)) return baseUrl
  return `https://${baseUrl}`
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''")
}

function isInTargetCalendarWindow(dateISO: string) {
  return dateISO >= TARGET_MONTH_START && dateISO <= TARGET_MONTH_END
}

function resolveInvoiceDate(context: InvoiceLogContext): {
  rawDate: string | null
  source: "dueDate" | "invoiceDate" | "docDate" | null
} {
  if (context.dueDate) {
    return { rawDate: context.dueDate, source: "dueDate" }
  }
  if (context.invoiceDate) {
    return { rawDate: context.invoiceDate, source: "invoiceDate" }
  }
  if (context.docDate) {
    return { rawDate: context.docDate, source: "docDate" }
  }
  return { rawDate: null, source: null }
}

function getInvoiceLogContext(invoice: AcumaticaARInvoice): InvoiceLogContext {
  return {
    type: unwrapString(invoice.Type),
    reference: unwrapString(invoice.ReferenceNbr),
    customerCode: unwrapString(invoice.Customer) ?? unwrapString(invoice.CustomerID),
    customerName: unwrapString(invoice.CustomerName),
    customerId: unwrapString(invoice.CustomerID),
    dueDate: unwrapString(invoice.DueDate),
    invoiceDate: unwrapString(invoice.Date),
    docDate: unwrapString(invoice.DocDate),
    amount: unwrapNumber(invoice.Amount),
    balance: unwrapNumber(invoice.Balance),
  }
}

async function fetchCustomerNameMapFromAcumatica(
  client: AcumaticaClient,
  organizationId: string,
  customerCodes: string[]
): Promise<Map<string, string>> {
  const customerNameMap = new Map<string, string>()
  if (customerCodes.length === 0) return customerNameMap

  const [tokenResult, credentialsResult] = await Promise.all([
    client.getValidToken({ organizationId }),
    client.getCredentials({ organizationId }),
  ])

  const acumaticaBaseUrlRaw = credentialsResult.credentials?.baseUrl
  if (!acumaticaBaseUrlRaw) {
    console.warn(`${LOG_PREFIX} No Acumatica baseUrl available for customer enrichment`)
    return customerNameMap
  }

  const acumaticaBaseUrl = normalizeAcumaticaBaseUrl(acumaticaBaseUrlRaw).replace(/\/$/, "")

  await Promise.all(
    customerCodes.map(async (customerCode) => {
      const customerUrl = new URL(
        `${acumaticaBaseUrl}/entity/Default/24.200.001/Customer`
      )
      customerUrl.searchParams.set(
        "$filter",
        `CustomerID eq '${escapeODataString(customerCode)}'`
      )
      customerUrl.searchParams.set("$select", "CustomerID,CustomerName")
      customerUrl.searchParams.set("$top", "1")

      const response = await fetch(customerUrl.toString(), {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      })

      if (!response.ok) {
        console.warn(`${LOG_PREFIX} Customer lookup request failed`, {
          customerCode,
          status: response.status,
        })
        return
      }

      const rows = (await response
        .json()
        .catch(() => null)) as AcumaticaCustomerRow[] | null
      if (!Array.isArray(rows) || rows.length === 0) return

      const row = rows[0]
      const resolvedCustomerCode = unwrapString(row.CustomerID) ?? customerCode
      const resolvedCustomerName = unwrapString(row.CustomerName)
      if (!resolvedCustomerName) return

      customerNameMap.set(resolvedCustomerCode, resolvedCustomerName)
    })
  )

  return customerNameMap
}

function mapInvoiceToCalendarInflow(
  invoice: AcumaticaARInvoice,
  index: number
): InvoiceMappingResult {
  const context = getInvoiceLogContext(invoice)
  const resolvedDate = resolveInvoiceDate(context)
  if (!resolvedDate.rawDate) {
    return {
      inflow: null,
      skippedReason: "missing_due_and_fallback_dates",
      context,
      dateSource: null,
    }
  }

  const dateISO = toDateISO(resolvedDate.rawDate)
  if (!dateISO) {
    return {
      inflow: null,
      skippedReason: `invalid_${resolvedDate.source ?? "date"}`,
      context,
      dateSource: resolvedDate.source,
    }
  }

  if (!isInTargetCalendarWindow(dateISO)) {
    return {
      inflow: null,
      skippedReason: "outside_target_window",
      context,
      dateSource: resolvedDate.source,
    }
  }

  const amount = context.balance ?? context.amount
  if (amount === null) {
    return {
      inflow: null,
      skippedReason: "missing_amount",
      context,
      dateSource: resolvedDate.source,
    }
  }
  if (amount <= 0) {
    return {
      inflow: null,
      skippedReason: "non_positive_amount",
      context,
      dateSource: resolvedDate.source,
    }
  }

  const reference = context.reference ?? `AR-${index + 1}`
  const customerCode = context.customerCode ?? context.customerId
  const customerName =
    context.customerName ?? customerCode ?? context.reference ?? "Unknown Customer"
  const customerId = customerCode ?? context.reference ?? "Unknown Customer"

  return {
    inflow: {
      id: `acu-ar-${reference}-${index}`,
      dateISO,
      entityName: customerName,
      entityId: customerId,
      reference,
      amount,
    },
    skippedReason: null,
    context,
    dateSource: resolvedDate.source,
  }
}

export async function loadCalendarInflowsFromARInvoices(
  organizationId: string
): Promise<CalendarInflowSeed[]> {
  const startedAt = Date.now()
  const serviceToken = readRequiredEnv("PLATFORM_ACUMATICA_SERVICE_TOKEN")
  const baseUrl = readOptionalEnv("PLATFORM_ACUMATICA_URL")

  if (!serviceToken) {
    return []
  }

  console.info(`${LOG_PREFIX} Starting AR invoice load`, {
    baseUrl,
    sourceApp: SOURCE_APP,
    organizationId: orgIdPreview(organizationId),
  })

  const client = new AcumaticaClient({
    baseUrl,
    serviceToken,
    sourceApp: SOURCE_APP,
    requestId: crypto.randomUUID(),
  })

  try {
    console.info(`${LOG_PREFIX} Requesting open AR invoices`, {
      endpoint: "/api/v1/ar/open-invoices",
      organizationId: orgIdPreview(organizationId),
    })

    const invoices = await client.getOpenARInvoices({ organizationId })
    console.info(`${LOG_PREFIX} AR invoice fetch succeeded`, {
      invoiceCount: invoices.length,
      elapsedMs: Date.now() - startedAt,
    })

    const mappedInflows: CalendarInflowSeed[] = []
    const mappedTypeCounts: Record<string, number> = {}
    const mappedDateSourceCounts: Record<string, number> = {}
    const mappedCustomerCodes = new Set<string>()
    const skippedReasons: Record<string, number> = {}
    const skippedSamples: Array<{ index: number; reason: string; context: InvoiceLogContext }> = []
    const mappedSamples: Array<{
      index: number
      type: string | null
      dateSource: "dueDate" | "invoiceDate" | "docDate" | null
      reference: string
      customerCode: string | null
      customerName: string
      calendarDate: string
      amount: number
    }> = []

    invoices.forEach((invoice, index) => {
      const result = mapInvoiceToCalendarInflow(invoice, index)
      if (result.inflow) {
        mappedInflows.push(result.inflow)
        if (result.context.customerCode) {
          mappedCustomerCodes.add(result.context.customerCode)
        }
        const typeKey = result.context.type ?? "unknown"
        mappedTypeCounts[typeKey] = (mappedTypeCounts[typeKey] ?? 0) + 1
        const dateSourceKey = result.dateSource ?? "unknown"
        mappedDateSourceCounts[dateSourceKey] =
          (mappedDateSourceCounts[dateSourceKey] ?? 0) + 1
        if (mappedSamples.length < 5) {
          mappedSamples.push({
            index,
            type: result.context.type,
            dateSource: result.dateSource,
            reference: result.inflow.reference,
            customerCode: result.context.customerCode,
            customerName: result.inflow.entityName,
            calendarDate: result.inflow.dateISO,
            amount: result.inflow.amount,
          })
        }
        return
      }

      const reason = result.skippedReason ?? "unknown"
      skippedReasons[reason] = (skippedReasons[reason] ?? 0) + 1
      if (skippedSamples.length < 5) {
        skippedSamples.push({ index, reason, context: result.context })
      }
    })

    let customerNameMap = new Map<string, string>()
    const customerCodes = Array.from(mappedCustomerCodes)
    if (customerCodes.length > 0) {
      try {
        customerNameMap = await fetchCustomerNameMapFromAcumatica(
          client,
          organizationId,
          customerCodes
        )
      } catch (error) {
        console.warn(`${LOG_PREFIX} Customer name enrichment failed`, {
          error,
          customerCodeCount: customerCodes.length,
        })
      }
    }

    const enrichedInflows = mappedInflows.map((inflow) => {
      const resolvedName = customerNameMap.get(inflow.entityId)
      if (!resolvedName) return inflow
      return { ...inflow, entityName: resolvedName }
    })

    if (skippedSamples.length > 0) {
      console.warn(`${LOG_PREFIX} Some AR invoices were skipped while mapping`, {
        skippedCount: invoices.length - enrichedInflows.length,
        skippedReasons,
        skippedSamples,
      })
    }

    console.info(`${LOG_PREFIX} Completed AR invoice mapping`, {
      mappedCount: enrichedInflows.length,
      skippedCount: invoices.length - enrichedInflows.length,
      targetWindow: "2026-02..2026-03",
      targetMonthStart: TARGET_MONTH_START,
      targetMonthEnd: TARGET_MONTH_END,
      mappedTypeCounts,
      mappedDateSourceCounts,
      customerNameResolution: {
        requestedCustomerCodes: customerCodes.length,
        resolvedCustomerNames: customerNameMap.size,
        unresolvedCustomerCodes: customerCodes.filter((code) => !customerNameMap.has(code)),
      },
      sampleMappedInvoices: mappedSamples,
      sampleMappedInflows: enrichedInflows.slice(0, 3),
      elapsedMs: Date.now() - startedAt,
    })

    return enrichedInflows
  } catch (error) {
    if (error instanceof AcumaticaError) {
      console.error(`${LOG_PREFIX} Failed to load AR invoices (AcumaticaError)`, {
        code: error.code,
        status: error.status,
        message: error.message,
        baseUrl,
        sourceApp: SOURCE_APP,
        organizationId: orgIdPreview(organizationId),
        elapsedMs: Date.now() - startedAt,
      })
      return []
    }

    console.error(`${LOG_PREFIX} Failed to load AR invoices (unexpected error)`, {
      error,
      baseUrl,
      sourceApp: SOURCE_APP,
      organizationId: orgIdPreview(organizationId),
      elapsedMs: Date.now() - startedAt,
    })
    return []
  }
}
