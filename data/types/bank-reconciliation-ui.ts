/**
 * Types for the Bank Reconciliation UI page
 */

export interface ReconDecisionRow {
  id: string
  organization_id: string
  tran_id: string
  tran_date: string
  amount: number
  description: string | null
  ext_ref_nbr: string | null
  suggested_action: string
  status: string
  confidence: number | null
  matched_doc_type: string | null
  matched_ref_nbr: string | null
  matched_candidate_id: string | null
  reasoning: string | null
  flag_for_review: boolean
  bank_transaction: Record<string, unknown> | null
  gpt_response: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ReconDecisionMetrics {
  total: number
  autoReconciled: number
  manualReview: number
  createNewEntry: number
  completed: number
  pending: number
  failed: number
}

export interface MatchDecisionInput {
  decisionId: string
}

export interface CreateEntryDecisionInput {
  decisionId: string
}

export type SortDirection = "asc" | "desc"

export type DecisionSortField =
  | "created_at"
  | "tran_date"
  | "amount"
  | "confidence"
  | "status"
  | "suggested_action"
