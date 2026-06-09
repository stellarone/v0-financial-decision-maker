export const SETTLEMENT_SUGGESTED_ACTIONS = {
  AUTO_MATCHED: "auto_matched",
  REVIEW_AMOUNT_MISMATCH: "review_amount_mismatch",
  NO_MATCH_FOUND: "no_match_found",
  EXCEPTION_CHARGEBACK: "exception_chargeback",
  EXCEPTION_ADJUSTMENT: "exception_adjustment",
  EXCEPTION_REFUND: "exception_refund",
} as const

export const SETTLEMENT_SUGGESTED_ACTION_LABELS: Record<string, string> = {
  [SETTLEMENT_SUGGESTED_ACTIONS.AUTO_MATCHED]: "Auto-matched",
  [SETTLEMENT_SUGGESTED_ACTIONS.REVIEW_AMOUNT_MISMATCH]:
    "Review — amount mismatch",
  [SETTLEMENT_SUGGESTED_ACTIONS.NO_MATCH_FOUND]: "No match found",
  [SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_CHARGEBACK]:
    "Exception — chargeback",
  [SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_ADJUSTMENT]:
    "Exception — adjustment",
  [SETTLEMENT_SUGGESTED_ACTIONS.EXCEPTION_REFUND]: "Exception — refund",
}

export const CONFIDENCE_LEVEL_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
}

export const SETTLEMENT_SECTION_LABELS: Record<string, string> = {
  auto_matched: "Auto-matched",
  needs_review: "Needs review",
  exception: "Exceptions / unmatched",
}

export const GL_ACCOUNT_OPTIONS = [
  { value: "6200", label: "6200 — Chargeback Expense" },
  { value: "6210", label: "6210 — Payment Processing Fees" },
  { value: "6220", label: "6220 — Seller Protection Adjustments" },
  { value: "4900", label: "4900 — Miscellaneous Income" },
] as const
