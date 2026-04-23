import "server-only"

import { AcumaticaClient } from "@/lib/clients/acumatica-client"
import { AcumaticaError } from "@/lib/clients/errors"
import type { AcumaticaAPBill } from "@/lib/clients/types"

const DEFAULT_PLATFORM_ACUMATICA_URL = "https://acumatica.stellarone.ai"
const SOURCE_APP = "finance"
const LOG_PREFIX = "[acumatica-calendar][ap-bills]"
const TARGET_MONTH_START = "2026-02-01"
const TARGET_MONTH_END = "2026-03-31"

export interface CalendarOutflowSeed {
  id: string
  dateISO: string
  entityName: string
  entityId: string
  reference: string
  amount: number
}

interface BillLogContext {
  type: string | null
  status: string | null
  reference: string | null
  vendorCode: string | null
  vendorName: string | null
  dueDate: string | null
  billDate: string | null
  docDate: string | null
  description: string | null
  amount: number | null
  balance: number | null
}

interface BillMappingResult {
  outflow: CalendarOutflowSeed | null
  skippedReason: string | null
  context: BillLogContext
  dateSource: "dueDate" | "billDate" | "docDate" | null
}

interface AcumaticaVendorRow {
  VendorID?: { value: string }
  VendorName?: { value: string }
}

function readRequiredEnv(name: "SUPABASE_SERVICE_ROLE_KEY" | "ACUMATICA_ORGANIZATION_ID") {
  const value = process.env[name]
  if (!value) {
    console.warn(`${LOG_PREFIX} Missing ${name}; skipping AP bills`)
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

function resolveBillDate(context: BillLogContext): {
  rawDate: string | null
  source: "dueDate" | "billDate" | "docDate" | null
} {
  if (context.dueDate) {
    return { rawDate: context.dueDate, source: "dueDate" }
  }
  if (context.billDate) {
    return { rawDate: context.billDate, source: "billDate" }
  }
  if (context.docDate) {
    return { rawDate: context.docDate, source: "docDate" }
  }
  return { rawDate: null, source: null }
}

function getBillLogContext(bill: AcumaticaAPBill): BillLogContext {
  return {
    type: unwrapString(bill.Type),
    status: unwrapString(bill.Status),
    reference: unwrapString(bill.ReferenceNbr),
    vendorCode: unwrapString(bill.Vendor) ?? unwrapString(bill.VendorID),
    vendorName: unwrapString(bill.VendorName),
    dueDate: unwrapString(bill.DueDate),
    billDate: unwrapString(bill.Date),
    docDate: unwrapString(bill.DocDate),
    description: unwrapString(bill.Description) ?? unwrapString(bill.VendorRef),
    amount: unwrapNumber(bill.Amount),
    balance: unwrapNumber(bill.Balance),
  }
}

async function fetchVendorNameMapFromAcumatica(
  client: AcumaticaClient,
  organizationId: string,
  vendorCodes: string[]
): Promise<Map<string, string>> {
  const vendorNameMap = new Map<string, string>()
  if (vendorCodes.length === 0) return vendorNameMap

  const [tokenResult, credentialsResult] = await Promise.all([
    client.getValidToken({ organizationId }),
    client.getCredentials({ organizationId }),
  ])

  const acumaticaBaseUrlRaw = credentialsResult.credentials?.baseUrl
  if (!acumaticaBaseUrlRaw) {
    console.warn(`${LOG_PREFIX} No Acumatica baseUrl available for vendor enrichment`)
    return vendorNameMap
  }

  const acumaticaBaseUrl = normalizeAcumaticaBaseUrl(acumaticaBaseUrlRaw).replace(/\/$/, "")

  await Promise.all(
    vendorCodes.map(async (vendorCode) => {
      const vendorUrl = new URL(
        `${acumaticaBaseUrl}/entity/Default/24.200.001/Vendor`
      )
      vendorUrl.searchParams.set(
        "$filter",
        `VendorID eq '${escapeODataString(vendorCode)}'`
      )
      vendorUrl.searchParams.set("$select", "VendorID,VendorName")
      vendorUrl.searchParams.set("$top", "1")

      const response = await fetch(vendorUrl.toString(), {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      })

      if (!response.ok) {
        console.warn(`${LOG_PREFIX} Vendor lookup request failed`, {
          vendorCode,
          status: response.status,
        })
        return
      }

      const rows = (await response
        .json()
        .catch(() => null)) as AcumaticaVendorRow[] | null
      if (!Array.isArray(rows) || rows.length === 0) return

      const row = rows[0]
      const resolvedVendorCode = unwrapString(row.VendorID) ?? vendorCode
      const resolvedVendorName = unwrapString(row.VendorName)
      if (!resolvedVendorName) return

      vendorNameMap.set(resolvedVendorCode, resolvedVendorName)
    })
  )

  return vendorNameMap
}

function mapBillToCalendarOutflow(
  bill: AcumaticaAPBill,
  index: number
): BillMappingResult {
  const context = getBillLogContext(bill)

  if (context.type !== "Bill") {
    return {
      outflow: null,
      skippedReason: "non_bill_type",
      context,
      dateSource: null,
    }
  }

  const resolvedDate = resolveBillDate(context)
  if (!resolvedDate.rawDate) {
    return {
      outflow: null,
      skippedReason: "missing_due_and_fallback_dates",
      context,
      dateSource: null,
    }
  }

  const dateISO = toDateISO(resolvedDate.rawDate)
  if (!dateISO) {
    return {
      outflow: null,
      skippedReason: `invalid_${resolvedDate.source ?? "date"}`,
      context,
      dateSource: resolvedDate.source,
    }
  }

  if (!isInTargetCalendarWindow(dateISO)) {
    return {
      outflow: null,
      skippedReason: "outside_target_window",
      context,
      dateSource: resolvedDate.source,
    }
  }

  const amount = context.balance ?? context.amount
  if (amount === null) {
    return {
      outflow: null,
      skippedReason: "missing_amount",
      context,
      dateSource: resolvedDate.source,
    }
  }
  if (amount <= 0) {
    return {
      outflow: null,
      skippedReason: "non_positive_amount",
      context,
      dateSource: resolvedDate.source,
    }
  }

  const reference = context.reference ?? `AP-${index + 1}`
  const vendorCode = context.vendorCode ?? reference
  const vendorName = context.vendorName ?? vendorCode

  return {
    outflow: {
      id: `acu-ap-${reference}-${index}`,
      dateISO,
      entityName: vendorName,
      entityId: vendorCode,
      reference,
      amount,
    },
    skippedReason: null,
    context,
    dateSource: resolvedDate.source,
  }
}

export async function loadCalendarOutflowsFromAPBills(): Promise<CalendarOutflowSeed[]> {
  const startedAt = Date.now()
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  const organizationId = readRequiredEnv("ACUMATICA_ORGANIZATION_ID")
  const baseUrl = readOptionalEnv("PLATFORM_ACUMATICA_URL")

  if (!serviceRoleKey || !organizationId) {
    return []
  }

  console.info(`${LOG_PREFIX} Starting AP bill load`, {
    baseUrl,
    sourceApp: SOURCE_APP,
    organizationId: orgIdPreview(organizationId),
  })

  const client = new AcumaticaClient({
    baseUrl,
    serviceRoleKey,
    sourceApp: SOURCE_APP,
    requestId: crypto.randomUUID(),
  })

  try {
    console.info(`${LOG_PREFIX} Requesting open AP bills`, {
      endpoint: "/api/v1/ap/open-bills",
      organizationId: orgIdPreview(organizationId),
    })

    const bills = await client.getOpenAPBills({ organizationId })
    console.info(`${LOG_PREFIX} AP bill fetch succeeded`, {
      billCount: bills.length,
      elapsedMs: Date.now() - startedAt,
    })

    const mappedOutflows: CalendarOutflowSeed[] = []
    const mappedTypeCounts: Record<string, number> = {}
    const mappedDateSourceCounts: Record<string, number> = {}
    const mappedVendorCodes = new Set<string>()
    const skippedReasons: Record<string, number> = {}
    const skippedSamples: Array<{ index: number; reason: string; context: BillLogContext }> = []
    const mappedSamples: Array<{
      index: number
      type: string | null
      dateSource: "dueDate" | "billDate" | "docDate" | null
      reference: string
      vendorCode: string | null
      vendorName: string
      calendarDate: string
      amount: number
    }> = []

    bills.forEach((bill, index) => {
      const result = mapBillToCalendarOutflow(bill, index)
      if (result.outflow) {
        mappedOutflows.push(result.outflow)
        if (result.context.vendorCode) {
          mappedVendorCodes.add(result.context.vendorCode)
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
            reference: result.outflow.reference,
            vendorCode: result.context.vendorCode,
            vendorName: result.outflow.entityName,
            calendarDate: result.outflow.dateISO,
            amount: result.outflow.amount,
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

    let vendorNameMap = new Map<string, string>()
    const vendorCodes = Array.from(mappedVendorCodes)
    if (vendorCodes.length > 0) {
      try {
        vendorNameMap = await fetchVendorNameMapFromAcumatica(
          client,
          organizationId,
          vendorCodes
        )
      } catch (error) {
        console.warn(`${LOG_PREFIX} Vendor name enrichment failed`, {
          error,
          vendorCodeCount: vendorCodes.length,
        })
      }
    }

    const enrichedOutflows = mappedOutflows.map((outflow) => {
      const resolvedName = vendorNameMap.get(outflow.entityId)
      if (!resolvedName) return outflow
      return { ...outflow, entityName: resolvedName }
    })

    if (skippedSamples.length > 0) {
      console.warn(`${LOG_PREFIX} Some AP bills were skipped while mapping`, {
        skippedCount: bills.length - enrichedOutflows.length,
        skippedReasons,
        skippedSamples,
      })
    }

    console.info(`${LOG_PREFIX} Completed AP bill mapping`, {
      mappedCount: enrichedOutflows.length,
      skippedCount: bills.length - enrichedOutflows.length,
      targetWindow: "2026-02..2026-03",
      targetMonthStart: TARGET_MONTH_START,
      targetMonthEnd: TARGET_MONTH_END,
      mappedTypeCounts,
      mappedDateSourceCounts,
      vendorNameResolution: {
        requestedVendorCodes: vendorCodes.length,
        resolvedVendorNames: vendorNameMap.size,
        unresolvedVendorCodes: vendorCodes.filter((code) => !vendorNameMap.has(code)),
      },
      sampleMappedBills: mappedSamples,
      sampleMappedOutflows: enrichedOutflows.slice(0, 3),
      elapsedMs: Date.now() - startedAt,
    })

    return enrichedOutflows
  } catch (error) {
    if (error instanceof AcumaticaError) {
      console.error(`${LOG_PREFIX} Failed to load AP bills (AcumaticaError)`, {
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

    console.error(`${LOG_PREFIX} Failed to load AP bills (unexpected error)`, {
      error,
      baseUrl,
      sourceApp: SOURCE_APP,
      organizationId: orgIdPreview(organizationId),
      elapsedMs: Date.now() - startedAt,
    })
    return []
  }
}
