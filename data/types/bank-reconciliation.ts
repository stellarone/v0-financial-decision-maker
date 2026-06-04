/**
 * Types for AI bank reconciliation workflow
 */
import { z } from "zod";

// ============================================================================
// Zod Schemas for AI SDK structured output
// ============================================================================

/**
 * Zod schema for match factors from AI decision
 */
export const MatchFactorsSchema = z.object({
  amount_match: z.enum(["exact", "processing_fee_outflow", "processing_fee_inflow", "close", "mismatch"]),
  amount_difference: z.number(),
  amount_difference_percent: z.number(),
  estimated_processing_fee: z.number(),
  date_match: z.enum(["exact", "normal", "delayed", "suspicious"]),
  days_difference: z.number(),
  type_alignment: z.boolean(),
  reference_match: z.boolean(),
  vendor_customer_match: z.boolean(),
  description_similarity: z.enum(["strong", "partial", "none"]),
});

/**
 * Zod schema for AI decision response from LLM
 * Used with AI SDK generateObject() for structured output
 */
export const AIDecisionResponseSchema = z.object({
  matched_candidate_id: z.string().nullable(),
  matched_source_type: z.string().nullable(),
  matched_reference_nbr: z.string().nullable(),
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string(),
  match_factors: MatchFactorsSchema,
  flag_for_review: z.boolean(),
  flag_reasons: z.array(z.string()),
  suggested_action: z.enum(["auto_reconcile", "manual_review", "create_new_entry"]),
  transaction_category: z.string(),
  risk_level: z.enum(["low", "medium", "high"]),
});

// Type inference from schema (for runtime validation)
export type AIDecisionResponseFromSchema = z.infer<typeof AIDecisionResponseSchema>;

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Webhook payload from Acumatica bank transaction push notification
 */
export interface BankTransactionWebhookPayload {
  Inserted: BankTransactionInserted[];
  Deleted: unknown[];
  Query: string;
  CompanyId: string;
  Id: string;
  TimeStamp: number;
  AdditionalInfo?: {
    PXPerformanceInfoStartTime?: string;
  };
}

/**
 * Bank transaction from Acumatica webhook
 */
export interface BankTransactionInserted {
  ID: number;
  TranDate: string;
  TranDesc: string;
  CuryTranAmt: number;
  DrCr: "Receipt" | "Disbursement";
  EntryTypeID: string | null;
  ExtRefNbr: string;
  Processed: boolean;
  CashAccount: string;
  OrganizationID: string | null;
}

/**
 * Parsed bank transaction for workflow processing
 */
export interface ParsedBankTransaction {
  tranId: number;
  tranDate: string;
  description: string;
  amount: number;
  drCr: "Receipt" | "Disbursement";
  entryType: string | null;
  extRefNbr: string;
  processed: boolean;
  notificationId: string;
  companyId: string;
  receivedAt: string;
  cashAccount: string;
  organizationId: string | null;
  originalTransaction: BankTransactionInserted;
}

/**
 * Normalized candidate for LLM matching
 */
export interface ReconciliationCandidate {
  source_type: string;
  id: string;
  reference_nbr: string | null;
  amount: number;
  date: string | null;
  description: string;
  vendor: string | null;
  customer: string | null;
  status: string | null;
  type: string | null;
  external_ref: string | null;
  cash_account: string | null;
  cleared: boolean | null;
  reconciled: boolean | null;
  _original: unknown;
}

/**
 * Match factors from AI decision
 */
export interface MatchFactors {
  amount_match: "exact" | "processing_fee_outflow" | "processing_fee_inflow" | "close" | "mismatch";
  amount_difference: number;
  amount_difference_percent: number;
  estimated_processing_fee: number;
  date_match: "exact" | "normal" | "delayed" | "suspicious";
  days_difference: number;
  type_alignment: boolean;
  reference_match: boolean;
  vendor_customer_match: boolean;
  description_similarity: "strong" | "partial" | "none";
}

/**
 * AI decision response from LLM
 */
export interface AIDecisionResponse {
  matched_candidate_id: string | null;
  matched_source_type: string | null;
  matched_reference_nbr: string | null;
  confidence_score: number;
  reasoning: string;
  match_factors: MatchFactors;
  flag_for_review: boolean;
  flag_reasons: string[];
  suggested_action: "auto_reconcile" | "manual_review" | "create_new_entry";
  transaction_category: string;
  risk_level: "low" | "medium" | "high";
}

/**
 * Enriched AI decision with context
 */
export interface EnrichedAIDecision extends AIDecisionResponse {
  bank_transaction: ParsedBankTransaction;
  matched_candidate: ReconciliationCandidate | null;
  timestamp: string;
  workflow_execution_id: string;
  llm_tokens_used: number;
  llm_cost_estimate: number;
}

/**
 * Recon decision payload for Supabase insert
 */
export interface ReconDecisionPayload {
  organization_id: string;
  source: string;
  tran_id: string;
  company_id: string;
  amount: number;
  tran_date: string;
  description: string;
  ext_ref_nbr: string;
  matched_doc_type: string | null;
  matched_ref_nbr: string | null;
  matched_candidate_id: string | null;
  confidence: number;
  suggested_action: string;
  flag_for_review: boolean;
  reasoning: string;
  status: string;
  workflow_version: string;
  prompt_version: string;
  gpt_response: EnrichedAIDecision;
  bank_transaction: ParsedBankTransaction;
}

/**
 * Recon decision record from Supabase
 */
export interface ReconDecisionRecord extends ReconDecisionPayload {
  id: string;
  created_at: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  final_doc_type?: string;
  final_ref_nbr?: string;
}

/**
 * Acumatica bank transaction match payload
 */
export interface AcumaticaBankTransactionMatchPayload {
  CashAccount: { value: string };
  ExtRefNbr: { value: string };
  MatchDetails: Array<{
    Matched: { value: boolean };
    Module: { value: string };
    MatchType: { value: string };
    InvoiceNbr: { value: string };
    BusinessAccount: { value: string };
  }>;
}

/**
 * Input for the bank reconciliation workflow
 */
export interface BankReconciliationInput {
  organizationId: string;
  webhookPayload: BankTransactionWebhookPayload;
  /** Optional URL to POST the result when workflow completes (fire-and-forget pattern) */
  callbackUrl?: string;
}

/**
 * Result for a single transaction processing
 */
export interface BankReconciliationTransactionResult {
  tranId: number;
  extRefNbr: string;
  amount: number;
  suggestedAction: string;
  confidence: number;
  matchedDocType: string | null;
  matchedRefNbr: string | null;
  decisionId: string;
  success: boolean;
  error?: string;
}

/**
 * Overall workflow result
 */
export interface BankReconciliationResult {
  organizationId: string;
  transactionCount: number;
  processedCount: number;
  autoReconciledCount: number;
  manualReviewCount: number;
  newEntryCount: number;
  errorCount: number;
  transactions: BankReconciliationTransactionResult[];
  timestamp: string;
}
