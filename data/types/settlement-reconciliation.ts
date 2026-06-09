export type SettlementLineType =
  | "charge"
  | "refund"
  | "payout"
  | "adjustment"
  | "dispute"

export type SettlementChannel = "shopify"

export interface NormalizedSettlementLine {
  batchId: string
  lineId: string
  externalOrderId: string | null
  type: SettlementLineType
  gross: number
  fee: number
  net: number
  currency: string
  txnDate: string
}

export interface ClearingPayment {
  id: string
  externalOrderId: string
  amount: number
  currency: string
  txnDate: string
  customerName: string
  reference: string
}

export type ConfidenceLevel = "high" | "medium" | "low" | "none"

export type SettlementSection =
  | "auto_matched"
  | "needs_review"
  | "exception"

export interface MatchResult {
  line: NormalizedSettlementLine
  matchedPayment: ClearingPayment | null
  confidence: ConfidenceLevel
  confidenceScore: number
  suggestedAction: string
  section: SettlementSection
  accepted: boolean
}

export type ExceptionResolutionType =
  | "book_as_fee"
  | "book_as_adjustment"
  | "ignore"
  | "match_manually"

export interface ExceptionResolution {
  lineId: string
  type: ExceptionResolutionType
  glAccount?: string
  manualPaymentId?: string
  acknowledged: boolean
}

export interface SettlementImportSummary {
  batchId: string
  channel: SettlementChannel
  dateRange: { start: string; end: string }
  transactionLineCount: number
  payoutNetTotal: number
  totalGross: number
  totalFees: number
  currency: string
}

export interface ReconciliationSummary {
  matchedPaymentsGross: number
  processorFees: number
  adjustmentsResolved: number
  reconciledTotal: number
  payoutNetControlTotal: number
  isBalanced: boolean
  variance: number
}

export interface ReleasePayload {
  batchId: string
  channel: SettlementChannel
  matchedPaymentIds: string[]
  matchedPaymentsGross: number
  feeEntryAmount: number
  exceptionResolutions: ExceptionResolution[]
  netDepositAmount: number
}

export interface ParsedSettlementBatch {
  lines: NormalizedSettlementLine[]
  summary: SettlementImportSummary
}
