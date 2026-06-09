import { SETTLEMENT_SUGGESTED_ACTIONS } from "@/data/constants/settlement-reconciliation"
import type {
  ClearingPayment,
  ConfidenceLevel,
  ExceptionResolution,
  MatchResult,
  NormalizedSettlementLine,
  ReconciliationSummary,
  SettlementSection,
} from "@/data/types/settlement-reconciliation"

const AMOUNT_MISMATCH_TOLERANCE = 0.01

function confidenceScoreForLevel(level: ConfidenceLevel): number {
  switch (level) {
    case "high":
      return 95
    case "medium":
      return 72
    case "low":
      return 45
    default:
      return 0
  }
}

function isAmountMismatch(
  settlementNet: number,
  paymentAmount: number
): boolean {
  return Math.abs(settlementNet - paymentAmount) > AMOUNT_MISMATCH_TOLERANCE
}

function classifyLine(
  line: NormalizedSettlementLine,
  payment: ClearingPayment | null
): Pick<
  MatchResult,
  "confidence" | "confidenceScore" | "suggestedAction" | "section" | "accepted"
> {
  if (line.type === "dispute") {
    return {
      confidence: "none",
      confidenceScore: 0,
      suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_CHARGEBACK,
      section: "exception",
      accepted: false,
    }
  }

  if (line.type === "adjustment") {
    return {
      confidence: "none",
      confidenceScore: 0,
      suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_ADJUSTMENT,
      section: "exception",
      accepted: false,
    }
  }

  if (line.type === "refund" && !payment) {
    return {
      confidence: "low",
      confidenceScore: confidenceScoreForLevel("low"),
      suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_REFUND,
      section: "exception",
      accepted: false,
    }
  }

  if (!payment || !line.externalOrderId) {
    return {
      confidence: "none",
      confidenceScore: 0,
      suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.NO_MATCH_FOUND,
      section: "exception",
      accepted: false,
    }
  }

  const compareAmount =
    line.type === "refund" ? Math.abs(line.net) : line.gross

  if (isAmountMismatch(compareAmount, payment.amount)) {
    return {
      confidence: "medium",
      confidenceScore: confidenceScoreForLevel("medium"),
      suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.REVIEW_AMOUNT_MISMATCH,
      section: "needs_review",
      accepted: false,
    }
  }

  return {
    confidence: "high",
    confidenceScore: confidenceScoreForLevel("high"),
    suggestedAction: SETTLEMENT_SUGGESTED_ACTIONS.AUTO_MATCHED,
    section: "auto_matched",
    accepted: true,
  }
}

export function matchSettlement(
  lines: NormalizedSettlementLine[],
  payments: ClearingPayment[]
): MatchResult[] {
  const paymentByOrder = new Map<string, ClearingPayment>()
  for (const payment of payments) {
    paymentByOrder.set(payment.externalOrderId, payment)
  }

  const matchableLines = lines.filter((line) => line.type !== "payout")

  return matchableLines.map((line) => {
    const payment = line.externalOrderId
      ? (paymentByOrder.get(line.externalOrderId) ?? null)
      : null

    const classification = classifyLine(line, payment)

    return {
      line,
      matchedPayment: payment,
      ...classification,
    }
  })
}

export function computeReconciliationSummary(
  matches: MatchResult[],
  payoutNetControlTotal: number,
  resolutions: Record<string, ExceptionResolution>
): ReconciliationSummary {
  const acceptedMatches = matches.filter(
    (match) =>
      match.accepted &&
      match.matchedPayment &&
      (match.section === "auto_matched" || match.section === "needs_review")
  )

  const matchedPaymentsGross = acceptedMatches.reduce(
    (sum, match) => sum + match.line.gross,
    0
  )

  const processorFees = acceptedMatches.reduce(
    (sum, match) => sum + match.line.fee,
    0
  )

  const adjustmentsResolved = matches
    .filter((match) => match.section === "exception")
    .reduce((sum, match) => {
      const resolution = resolutions[match.line.lineId]
      if (!resolution?.acknowledged) return sum

      if (resolution.type === "ignore") return sum

      if (resolution.type === "match_manually" && resolution.manualPaymentId) {
        return sum + match.line.net
      }

      return sum + match.line.net
    }, 0)

  const reconciledTotal =
    matchedPaymentsGross - processorFees + adjustmentsResolved

  const variance = reconciledTotal - payoutNetControlTotal
  const isBalanced = Math.abs(variance) < AMOUNT_MISMATCH_TOLERANCE

  return {
    matchedPaymentsGross,
    processorFees,
    adjustmentsResolved,
    reconciledTotal,
    payoutNetControlTotal,
    isBalanced,
    variance,
  }
}

export function groupMatchesBySection(
  matches: MatchResult[]
): Record<SettlementSection, MatchResult[]> {
  return {
    auto_matched: matches.filter((m) => m.section === "auto_matched"),
    needs_review: matches.filter((m) => m.section === "needs_review"),
    exception: matches.filter((m) => m.section === "exception"),
  }
}

export function allExceptionsResolved(
  matches: MatchResult[],
  resolutions: Record<string, ExceptionResolution>
): boolean {
  const exceptions = matches.filter((m) => m.section === "exception")
  if (exceptions.length === 0) return true

  return exceptions.every((match) => {
    const resolution = resolutions[match.line.lineId]
    return resolution?.acknowledged === true
  })
}

export function allReviewItemsAccepted(matches: MatchResult[]): boolean {
  const reviewItems = matches.filter((m) => m.section === "needs_review")
  return reviewItems.every((match) => match.accepted)
}
