/**
 * Constants for AI bank reconciliation workflow
 */

/**
 * Workflow step names for progress tracking
 */
export const BANK_RECON_STEPS = {
  // Workflow lifecycle
  WORKFLOW_START: "workflow_start",
  WORKFLOW_COMPLETE: "workflow_complete",

  // Transaction parsing
  PARSE_TRANSACTIONS: "parse_transactions",

  // Candidate fetching
  FETCH_AP_BILLS: "fetch_ap_bills",
  FETCH_AP_PAYMENTS: "fetch_ap_payments",
  FETCH_AR_INVOICES: "fetch_ar_invoices",
  FETCH_AR_PAYMENTS: "fetch_ar_payments",
  FETCH_CASH_TRANSACTIONS: "fetch_cash_transactions",
  MERGE_CANDIDATES: "merge_candidates",

  // AI decision
  AI_DECISION: "ai_decision",

  // Routing actions
  INSERT_DECISION: "insert_decision",
  ROUTE_ACTION: "route_action",
  UPDATE_ACUMATICA: "update_acumatica",
  UPDATE_DECISION_STATUS: "update_decision_status",
} as const;

/**
 * Human-readable step labels for UI display
 */
export const BANK_RECON_STEP_LABELS: Record<string, string> = {
  [BANK_RECON_STEPS.WORKFLOW_START]: "Starting workflow",
  [BANK_RECON_STEPS.PARSE_TRANSACTIONS]: "Parsing bank transactions",
  [BANK_RECON_STEPS.FETCH_AP_BILLS]: "Fetching AP bills",
  [BANK_RECON_STEPS.FETCH_AP_PAYMENTS]: "Fetching AP payments",
  [BANK_RECON_STEPS.FETCH_AR_INVOICES]: "Fetching AR invoices",
  [BANK_RECON_STEPS.FETCH_AR_PAYMENTS]: "Fetching AR payments",
  [BANK_RECON_STEPS.FETCH_CASH_TRANSACTIONS]: "Fetching cash transactions",
  [BANK_RECON_STEPS.MERGE_CANDIDATES]: "Merging candidates",
  [BANK_RECON_STEPS.AI_DECISION]: "Running AI decision",
  [BANK_RECON_STEPS.INSERT_DECISION]: "Inserting recon decision",
  [BANK_RECON_STEPS.ROUTE_ACTION]: "Routing by suggested action",
  [BANK_RECON_STEPS.UPDATE_ACUMATICA]: "Updating Acumatica",
  [BANK_RECON_STEPS.UPDATE_DECISION_STATUS]: "Updating decision status",
  [BANK_RECON_STEPS.WORKFLOW_COMPLETE]: "Workflow complete",
} as const;

/**
 * Suggested actions from AI decision
 */
export const SUGGESTED_ACTIONS = {
  AUTO_RECONCILE: "auto_reconcile",
  MANUAL_REVIEW: "manual_review",
  CREATE_NEW_ENTRY: "create_new_entry",
} as const;

/**
 * Recon decision status values
 */
export const RECON_DECISION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

/**
 * Candidate source types
 */
export const CANDIDATE_SOURCE_TYPES = {
  AP_BILL: "APBill",
  AP_PAYMENT: "APPayment",
  AR_INVOICE: "ARInvoice",
  AR_PAYMENT: "ARPayment",
  CASH_TRANSACTION: "CashTransaction",
} as const;

/**
 * Workflow version info
 */
export const BANK_RECON_VERSIONS = {
  WORKFLOW_VERSION: "1.0.0",
  PROMPT_VERSION: "2.0.0",
} as const;

/**
 * Acumatica FinOps API entity config
 */
export const FINOPS_ENTITY_CONFIG = {
  endpoint: "FinOps",
  version: "24.200.001",
} as const;

/**
 * Human-readable labels for suggested actions (UI display)
 */
export const SUGGESTED_ACTION_LABELS: Record<string, string> = {
  [SUGGESTED_ACTIONS.AUTO_RECONCILE]: "Auto Reconciled",
  [SUGGESTED_ACTIONS.MANUAL_REVIEW]: "Manual Review",
  [SUGGESTED_ACTIONS.CREATE_NEW_ENTRY]: "Create New Entry",
} as const;

/**
 * Human-readable labels for decision status values (UI display)
 */
export const RECON_DECISION_STATUS_LABELS: Record<string, string> = {
  [RECON_DECISION_STATUS.PENDING]: "Pending",
  [RECON_DECISION_STATUS.COMPLETED]: "Completed",
  [RECON_DECISION_STATUS.FAILED]: "Failed",
} as const;

/**
 * Columns displayed in the decisions table
 */
export const RECON_DECISIONS_TABLE_COLUMNS = [
  "tran_date",
  "tran_id",
  "amount",
  "description",
  "suggested_action",
  "status",
  "confidence",
  "matched_doc_type",
  "matched_ref_nbr",
  "created_at",
  "actions",
] as const;
