import Papa from "papaparse"
import type {
  NormalizedSettlementLine,
  ParsedSettlementBatch,
  SettlementImportSummary,
  SettlementLineType,
} from "@/data/types/settlement-reconciliation"

interface ShopifyCsvRow {
  "Transaction Date"?: string
  Type?: string
  Order?: string
  Amount?: string
  Fee?: string
  Net?: string
  Currency?: string
}

function parseMoney(value: string | undefined): number {
  if (!value || value.trim() === "") return 0
  const cleaned = value.replace(/[$,]/g, "").trim()
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeType(raw: string | undefined): SettlementLineType {
  const value = (raw ?? "").trim().toLowerCase()
  if (value === "charge") return "charge"
  if (value === "refund") return "refund"
  if (value === "payout") return "payout"
  if (value === "adjustment") return "adjustment"
  if (value === "dispute") return "dispute"
  return "adjustment"
}

function extractBatchId(rows: ShopifyCsvRow[]): string {
  const payoutRow = rows.find(
    (row) => (row.Type ?? "").trim().toLowerCase() === "payout"
  )
  if (payoutRow?.["Transaction Date"]) {
    return `shopify-${payoutRow["Transaction Date"].replace(/\//g, "-")}`
  }
  const firstDate = rows.find((row) => row["Transaction Date"])?.[
    "Transaction Date"
  ]
  return firstDate ? `shopify-${firstDate.replace(/\//g, "-")}` : "shopify-batch"
}

function toIsoDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toISOString().slice(0, 10)
}

function buildSummary(
  batchId: string,
  matchableLines: NormalizedSettlementLine[],
  payoutNetTotal: number
): SettlementImportSummary {
  const dates = matchableLines
    .map((line) => line.txnDate)
    .filter(Boolean)
    .sort()

  const totalGross = matchableLines.reduce((sum, line) => sum + line.gross, 0)
  const totalFees = matchableLines.reduce((sum, line) => sum + line.fee, 0)

  return {
    batchId,
    channel: "shopify",
    dateRange: {
      start: dates[0] ?? new Date().toISOString().slice(0, 10),
      end: dates[dates.length - 1] ?? dates[0] ?? new Date().toISOString().slice(0, 10),
    },
    transactionLineCount: matchableLines.length,
    payoutNetTotal,
    totalGross,
    totalFees,
    currency: matchableLines[0]?.currency ?? "USD",
  }
}

/**
 * Shopify-specific CSV adapter. All other channels should provide their own
 * adapter that returns NormalizedSettlementLine[].
 */
export function parseShopifyPayoutCsv(csvText: string): ParsedSettlementBatch {
  const parsed = Papa.parse<ShopifyCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(
      `Failed to parse Shopify CSV: ${parsed.errors[0]?.message ?? "unknown error"}`
    )
  }

  const batchId = extractBatchId(parsed.data)
  const lines: NormalizedSettlementLine[] = []
  let payoutNetTotal = 0

  parsed.data.forEach((row, index) => {
    const type = normalizeType(row.Type)
    const gross = parseMoney(row.Amount)
    const fee = parseMoney(row.Fee)
    const net = parseMoney(row.Net)
    const currency = (row.Currency ?? "USD").trim() || "USD"
    const orderId = (row.Order ?? "").trim() || null

    if (type === "payout") {
      payoutNetTotal = net !== 0 ? net : gross - fee
      return
    }

    lines.push({
      batchId,
      lineId: `${batchId}-${index}`,
      externalOrderId: orderId,
      type,
      gross,
      fee,
      net: net !== 0 ? net : gross - fee,
      currency,
      txnDate: toIsoDate(row["Transaction Date"]),
    })
  })

  const matchableLines = lines.filter((line) => line.type !== "payout")

  if (payoutNetTotal === 0) {
    payoutNetTotal = matchableLines.reduce((sum, line) => sum + line.net, 0)
  }

  return {
    lines,
    summary: buildSummary(batchId, matchableLines, payoutNetTotal),
  }
}
