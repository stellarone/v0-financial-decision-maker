import "server-only"

import { AcumaticaClient } from "@/lib/clients/acumatica-client"
import { AcumaticaError } from "@/lib/clients/errors"
import type { AcumaticaCashSummary } from "@/lib/clients/types"

const DEFAULT_PLATFORM_ACUMATICA_URL = "https://acumatica.stellarone.ai"
const SOURCE_APP = "finance"
const LOG_PREFIX = "[acumatica-calendar][cash-summary]"
const BALANCE_FIELD_CANDIDATES = [
  "PTDBalance",
  "CurrentBalance",
  "Balance",
  "CashBalance",
  "CuryBalance",
  "AvailableBalance",
] as const
const PERIOD_FIELD_CANDIDATES = ["FinancialPeriodID", "FinancialPeriod"] as const
const ACCOUNT_FIELD_CANDIDATES = ["AccountCD", "Account", "AccountID"] as const

function readRequiredEnv(name: "PLATFORM_ACUMATICA_SERVICE_TOKEN") {
  const value = process.env[name]
  if (!value) {
    console.warn(`${LOG_PREFIX} Missing ${name}; falling back to default balance`)
    return null
  }
  return value
}

function readOptionalEnv(name: "PLATFORM_ACUMATICA_URL") {
  return process.env[name] ?? DEFAULT_PLATFORM_ACUMATICA_URL
}

function orgIdPreview(organizationId: string) {
  if (organizationId.length <= 12) return organizationId
  return `${organizationId.slice(0, 8)}...${organizationId.slice(-4)}`
}

function unwrapAcumaticaValue(value: unknown) {
  if (value && typeof value === "object" && "value" in value) {
    return (value as { value: unknown }).value
  }
  return value
}

function parseBalance(value: unknown) {
  const unwrapped = unwrapAcumaticaValue(value)

  if (typeof unwrapped === "number") {
    return Number.isFinite(unwrapped) ? unwrapped : null
  }

  if (typeof unwrapped !== "string") {
    return null
  }

  const trimmed = unwrapped.trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[$,\s]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function getFieldValue(
  row: AcumaticaCashSummary,
  fieldName:
    | (typeof BALANCE_FIELD_CANDIDATES)[number]
    | (typeof PERIOD_FIELD_CANDIDATES)[number]
    | (typeof ACCOUNT_FIELD_CANDIDATES)[number]
) {
  if (fieldName in row) return row[fieldName]

  const lowerFieldName = fieldName.toLowerCase()
  const matchingEntry = Object.entries(row).find(
    ([key]) => key.toLowerCase() === lowerFieldName
  )
  return matchingEntry?.[1]
}

function parsePeriodValue(value: unknown) {
  const unwrapped = unwrapAcumaticaValue(value)
  if (typeof unwrapped !== "string" && typeof unwrapped !== "number") return null

  const period = String(unwrapped).trim()
  return period.length > 0 ? period : null
}

function getCashSummaryPeriod(row: AcumaticaCashSummary) {
  for (const fieldName of PERIOD_FIELD_CANDIDATES) {
    const period = parsePeriodValue(getFieldValue(row, fieldName))
    if (period) return period
  }

  return null
}

function getPeriodSortKey(period: string) {
  const digits = period.replace(/\D/g, "")
  if (digits.length !== 6) return null

  const yearFirst = Number(digits.slice(0, 4))
  const monthAfterYear = Number(digits.slice(4, 6))
  if (monthAfterYear >= 1 && monthAfterYear <= 12) {
    return yearFirst * 100 + monthAfterYear
  }

  const monthFirst = Number(digits.slice(0, 2))
  const yearAfterMonth = Number(digits.slice(2, 6))
  if (monthFirst >= 1 && monthFirst <= 12) {
    return yearAfterMonth * 100 + monthFirst
  }

  return null
}

function comparePeriods(left: string, right: string) {
  const leftSortKey = getPeriodSortKey(left)
  const rightSortKey = getPeriodSortKey(right)

  if (leftSortKey !== null && rightSortKey !== null) {
    return leftSortKey - rightSortKey
  }

  return left.localeCompare(right)
}

function getCashSummaryAccountKey(row: AcumaticaCashSummary) {
  for (const fieldName of ACCOUNT_FIELD_CANDIDATES) {
    const account = parsePeriodValue(getFieldValue(row, fieldName))
    if (account) return account
  }

  return null
}

function dedupeCashSummaryRowsByAccount(rows: AcumaticaCashSummary[]) {
  const deduped = new Map<string, AcumaticaCashSummary>()
  const withoutAccountKey: AcumaticaCashSummary[] = []

  rows.forEach((row) => {
    const accountKey = getCashSummaryAccountKey(row)
    if (accountKey) {
      deduped.set(accountKey, row)
      return
    }
    withoutAccountKey.push(row)
  })

  return [...deduped.values(), ...withoutAccountKey]
}

function getLatestCashSummaryPeriod(rows: AcumaticaCashSummary[]) {
  let latestPeriod: string | null = null

  rows.forEach((row) => {
    const period = getCashSummaryPeriod(row)
    if (!period) return
    if (!latestPeriod || comparePeriods(period, latestPeriod) > 0) {
      latestPeriod = period
    }
  })

  return latestPeriod
}

export function extractCashSummaryBalance(row: AcumaticaCashSummary) {
  for (const fieldName of BALANCE_FIELD_CANDIDATES) {
    const balance = parseBalance(getFieldValue(row, fieldName))
    if (balance !== null) {
      return { balance, fieldName }
    }
  }

  return null
}

export async function loadCurrentCashPositionFromCashSummary(
  organizationId: string
): Promise<number | null> {
  const startedAt = Date.now()
  const serviceToken = readRequiredEnv("PLATFORM_ACUMATICA_SERVICE_TOKEN")
  const baseUrl = readOptionalEnv("PLATFORM_ACUMATICA_URL")

  if (!serviceToken) {
    return null
  }

  const client = new AcumaticaClient({
    baseUrl,
    serviceToken,
    sourceApp: SOURCE_APP,
    requestId: crypto.randomUUID(),
  })

  try {
    console.info(`${LOG_PREFIX} Requesting CA-CashSummary`, {
      endpoint: "/api/v1/cash/summary",
      organizationId: orgIdPreview(organizationId),
    })

    const rows = await client.getCashSummary({ organizationId })
    console.info(`${LOG_PREFIX} Received CA-CashSummary rows`, {
      rowCount: rows.length,
      firstRowKeys: rows[0] ? Object.keys(rows[0]).slice(0, 20) : [],
      balanceFieldCandidates: BALANCE_FIELD_CANDIDATES,
      elapsedMs: Date.now() - startedAt,
    })

    const latestPeriod = getLatestCashSummaryPeriod(rows)
    const latestPeriodRows = latestPeriod
      ? rows.filter((row) => getCashSummaryPeriod(row) === latestPeriod)
      : []
    const rowsToMap = latestPeriod
      ? latestPeriodRows
      : rows.length <= 1
        ? rows
        : dedupeCashSummaryRowsByAccount(rows)
    const fieldCounts: Record<string, number> = {}
    const skippedSamples: Array<{ index: number; keys: string[] }> = []
    const mappedSamples: Array<{
      index: number
      fieldName: (typeof BALANCE_FIELD_CANDIDATES)[number]
      balance: number
    }> = []
    let total = 0
    let mappedCount = 0

    rowsToMap.forEach((row, index) => {
      const extracted = extractCashSummaryBalance(row)
      if (!extracted) {
        if (skippedSamples.length < 5) {
          skippedSamples.push({ index, keys: Object.keys(row).slice(0, 12) })
        }
        return
      }

      total += extracted.balance
      mappedCount += 1
      fieldCounts[extracted.fieldName] = (fieldCounts[extracted.fieldName] ?? 0) + 1
      if (mappedSamples.length < 5) {
        mappedSamples.push({
          index,
          fieldName: extracted.fieldName,
          balance: extracted.balance,
        })
      }
    })

    if (mappedCount === 0) {
      console.warn(`${LOG_PREFIX} No usable balance fields found in CA-CashSummary`, {
        rowCount: rows.length,
        latestPeriod,
        latestPeriodRowCount: latestPeriodRows.length,
        balanceFieldCandidates: BALANCE_FIELD_CANDIDATES,
        skippedSamples,
        elapsedMs: Date.now() - startedAt,
      })
      return null
    }

    if (skippedSamples.length > 0) {
      console.warn(`${LOG_PREFIX} Some CA-CashSummary rows were skipped`, {
        rowCount: rows.length,
        latestPeriod,
        latestPeriodRowCount: latestPeriodRows.length,
        mappedCount,
        skippedCount: rowsToMap.length - mappedCount,
        skippedSamples,
      })
    }

    console.info(`${LOG_PREFIX} Completed CA-CashSummary mapping`, {
      rowCount: rows.length,
      latestPeriod,
      latestPeriodRowCount: latestPeriodRows.length,
      mappedCount,
      fieldCounts,
      mappedSamples,
      total,
      elapsedMs: Date.now() - startedAt,
    })

    return total
  } catch (error) {
    if (error instanceof AcumaticaError) {
      console.error(`${LOG_PREFIX} Failed to load CA-CashSummary`, {
        code: error.code,
        status: error.status,
        message: error.message,
        baseUrl,
        sourceApp: SOURCE_APP,
        organizationId: orgIdPreview(organizationId),
        elapsedMs: Date.now() - startedAt,
      })
      return null
    }

    console.error(`${LOG_PREFIX} Unexpected error loading CA-CashSummary`, {
      error,
      baseUrl,
      sourceApp: SOURCE_APP,
      organizationId: orgIdPreview(organizationId),
      elapsedMs: Date.now() - startedAt,
    })
    return null
  }
}
