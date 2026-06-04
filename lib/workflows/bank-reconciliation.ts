/**
 * AI Bank Reconciliation Workflow
 *
 * Processes bank transactions from Acumatica webhook, uses AI to match
 * candidates, and routes actions based on AI decision.
 *
 * Fire-and-forget pattern: Returns 202 immediately, posts result to callbackUrl.
 * Observability: Console logs via wf.log for structured logging.
 */
"use workflow";

import { getWritable } from "workflow";
import { createAcumaticaClient } from "@/lib/clients/acumatica";
import { resolveMatchModuleFields } from "@/lib/bank-reconciliation/resolve-match-module-fields";
import {
  writeProgressEvent,
  writeResultEvent,
  writeStepCompleteEvent,
} from "@/lib/bank-reconciliation/stream-events";
import { updateReconDecisionWithRetry } from "@/lib/bank-reconciliation/update-recon-decision-with-retry";
import { finopsDb } from "@/lib/services/finops-db";
import { generateStructuredOutput } from "@/lib/services/ai";
import { wf } from "@/lib/services/workflow";
import {
  BANK_RECON_STEPS,
  BANK_RECON_STEP_LABELS,
  SUGGESTED_ACTIONS,
  RECON_DECISION_STATUS,
  CANDIDATE_SOURCE_TYPES,
  BANK_RECON_VERSIONS,
} from "@/data/constants/bank-reconciliation";
import {
  AIDecisionResponseSchema,
  type BankReconciliationInput,
  type BankReconciliationResult,
  type BankReconciliationTransactionResult,
  type ParsedBankTransaction,
  type ReconciliationCandidate,
  type AIDecisionResponse,
  type EnrichedAIDecision,
} from "@/data/types/bank-reconciliation";

const WORKFLOW_NAME = "bank-reconciliation";

// ============================================================================
// Stream helpers (thin steps — heavy progress is written inside long steps)
// ============================================================================

async function emitProgress(
  step: string,
  message: string,
  percent?: number
): Promise<void> {
  "use step";
  await writeProgressEvent(step, message, percent);
}

async function emitStepComplete(
  step: string,
  durationMs: number,
  success: boolean,
  error?: string
): Promise<void> {
  "use step";
  await writeStepCompleteEvent(step, durationMs, success, error);
}

async function emitResult(result: BankReconciliationResult): Promise<void> {
  "use step";
  await writeResultEvent(result);
}

async function closeWorkflowStream(): Promise<void> {
  "use step";
  await getWritable<string>().close();
}

/** Safe workflow log payload — excludes per-transaction reconciliation details. */
function summarizeResultForLog(result: BankReconciliationResult) {
  return {
    organizationId: result.organizationId,
    transactionCount: result.transactionCount,
    processedCount: result.processedCount,
    autoReconciledCount: result.autoReconciledCount,
    manualReviewCount: result.manualReviewCount,
    newEntryCount: result.newEntryCount,
    errorCount: result.errorCount,
    timestamp: result.timestamp,
  };
}

function logResult(result: BankReconciliationResult): void {
  wf.log(WORKFLOW_NAME, "Result", summarizeResultForLog(result));
}

function logError(message: string, code?: string): void {
  wf.log(WORKFLOW_NAME, "Error", { message, code });
}

// ============================================================================
// Callback Step (fire-and-forget pattern)
// ============================================================================

/**
 * POST the workflow result to the callback URL when complete.
 * Uses WDK step durability for automatic retries on failure.
 */
async function postResultToCallback(
  callbackUrl: string,
  result: BankReconciliationResult
): Promise<void> {
  "use step";
  const startTime = Date.now();
  wf.log(WORKFLOW_NAME, "Posting result to callback URL", { callbackUrl });

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "workflow_complete",
        data: result,
        timestamp: new Date().toISOString(),
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      wf.log(WORKFLOW_NAME, "Callback failed", {
        status: response.status,
        statusText: response.statusText,
        callbackUrl,
        durationMs,
      });
      // Throw to trigger WDK step retry
      throw new Error(`Callback failed with status ${response.status}`);
    }

    wf.log(WORKFLOW_NAME, "Callback successful", {
      status: response.status,
      callbackUrl,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    wf.log(WORKFLOW_NAME, "Callback error", {
      error: error instanceof Error ? error.message : String(error),
      callbackUrl,
      durationMs,
    });
    throw error; // Re-throw to trigger WDK step retry
  }
}

// ============================================================================
// Transaction Parsing
// ============================================================================

function parseTransactions(
  webhookPayload: BankReconciliationInput["webhookPayload"]
): ParsedBankTransaction[] {
  const insertedTransactions = webhookPayload.Inserted || [];
  if (insertedTransactions.length === 0) {
    return [];
  }

  return insertedTransactions
    .filter((txn) => txn.OrganizationID) // Filter out transactions without OrganizationID
    .map((txn) => ({
      tranId: txn.ID,
      tranDate: txn.TranDate,
      description: txn.TranDesc,
      amount: txn.CuryTranAmt,
      drCr: txn.DrCr,
      entryType: txn.EntryTypeID,
      extRefNbr: txn.ExtRefNbr,
      processed: txn.Processed,
      notificationId: webhookPayload.Id,
      companyId: webhookPayload.CompanyId,
      receivedAt: new Date().toISOString(),
      cashAccount: txn.CashAccount?.trim() || "1000",
      organizationId: txn.OrganizationID,
      originalTransaction: txn,
    }));
}

// ============================================================================
// Candidate Fetching Steps
// ============================================================================

async function fetchAllCandidates(
  organizationId: string
): Promise<ReconciliationCandidate[]> {
  "use step";
  const startTime = Date.now();
  wf.log(WORKFLOW_NAME, "Fetching all candidates from Acumatica");

  const client = createAcumaticaClient();

  // Fetch candidate types sequentially; stream progress inside this step so the
  // UI updates during long Acumatica calls (separate emitProgress steps only run
  // after this step finishes).
  await writeProgressEvent(
    BANK_RECON_STEPS.MERGE_CANDIDATES,
    "Fetching AP bills from Acumatica…",
    10
  );
  const apBills = await client.getAPBillsForRecon({ organizationId });
  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AP_BILLS,
    `Loaded ${apBills.length} AP bill groups`,
    18
  );

  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AP_PAYMENTS,
    "Fetching AP payments…",
    22
  );
  const apPayments = await client.getAPPaymentsForRecon({ organizationId });
  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AP_PAYMENTS,
    `Loaded ${apPayments.length} AP payment groups`,
    30
  );

  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AR_INVOICES,
    "Fetching AR invoices…",
    34
  );
  const arInvoices = await client.getARInvoicesForRecon({ organizationId });
  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AR_INVOICES,
    `Loaded ${arInvoices.length} AR invoice groups`,
    42
  );

  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AR_PAYMENTS,
    "Fetching AR payments…",
    46
  );
  const arPayments = await client.getARPaymentsForRecon({ organizationId });
  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_AR_PAYMENTS,
    `Loaded ${arPayments.length} AR payment groups`,
    52
  );

  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_CASH_TRANSACTIONS,
    "Fetching cash transactions…",
    54
  );
  const cashTransactions = await client.getCashTransactionsForRecon({
    organizationId,
  });
  await writeProgressEvent(
    BANK_RECON_STEPS.FETCH_CASH_TRANSACTIONS,
    `Loaded ${cashTransactions.length} cash transaction groups`,
    58
  );

  const allCandidates: ReconciliationCandidate[] = [];

  // Normalize AP Bills
  for (const item of apBills as Array<{ APBillsDetails?: unknown[] }>) {
    const details = item.APBillsDetails || [];
    for (const record of details as Array<Record<string, unknown>>) {
      allCandidates.push(normalizeCandidate(CANDIDATE_SOURCE_TYPES.AP_BILL, record));
    }
  }

  // Normalize AP Payments
  for (const item of apPayments as Array<{ APPaymentsDetails?: unknown[] }>) {
    const details = item.APPaymentsDetails || [];
    for (const record of details as Array<Record<string, unknown>>) {
      allCandidates.push(normalizeCandidate(CANDIDATE_SOURCE_TYPES.AP_PAYMENT, record));
    }
  }

  // Normalize AR Invoices
  for (const item of arInvoices as Array<{ ARInvoicesDetails?: unknown[] }>) {
    const details = item.ARInvoicesDetails || [];
    for (const record of details as Array<Record<string, unknown>>) {
      allCandidates.push(normalizeCandidate(CANDIDATE_SOURCE_TYPES.AR_INVOICE, record));
    }
  }

  // Normalize AR Payments
  for (const item of arPayments as Array<{ ARPaymentsDetails?: unknown[] }>) {
    const details = item.ARPaymentsDetails || [];
    for (const record of details as Array<Record<string, unknown>>) {
      allCandidates.push(normalizeCandidate(CANDIDATE_SOURCE_TYPES.AR_PAYMENT, record));
    }
  }

  // Normalize Cash Transactions
  for (const item of cashTransactions as Array<{
    CashTransactionsDetails?: unknown[];
  }>) {
    const details = item.CashTransactionsDetails || [];
    for (const record of details as Array<Record<string, unknown>>) {
      allCandidates.push(
        normalizeCandidate(CANDIDATE_SOURCE_TYPES.CASH_TRANSACTION, record)
      );
    }
  }
  const durationMs = Date.now() - startTime;
  wf.log(WORKFLOW_NAME, "Candidates fetched", {
    total: allCandidates.length,
    apBills: apBills.length,
    apPayments: apPayments.length,
    arInvoices: arInvoices.length,
    arPayments: arPayments.length,
    cashTransactions: cashTransactions.length,
    durationMs,
  });

  return allCandidates;
}

function normalizeCandidate(
  sourceType: string,
  record: Record<string, unknown>
): ReconciliationCandidate {
  const getValue = (field: unknown): string | null => {
    if (typeof field === "object" && field !== null && "value" in field) {
      const innerValue = (field as { value: unknown }).value;
      if (innerValue === null || innerValue === undefined) {
        return null;
      }
      return String(innerValue) || null;
    }
    return field !== undefined && field !== null ? String(field) : null;
  };

  const getNumericValue = (field: unknown): number => {
    const val = getValue(field);
    return val ? parseFloat(val) : 0;
  };

  const getBoolValue = (field: unknown): boolean | null => {
    const val = getValue(field);
    if (val === null) return null;
    return val.toLowerCase() === "true";
  };

  return {
    source_type: sourceType,
    id: getValue(record.id) || getValue(record.ID) || "",
    reference_nbr:
      getValue(record.ReferenceNbr) ||
      getValue(record.DocumentNumber)?.toString() ||
      null,
    amount:
      getNumericValue(record.Amount) ||
      getNumericValue(record.PaymentAmount) ||
      getNumericValue(record.Balance) ||
      0,
    date:
      getValue(record.Date) ||
      getValue(record.PaymentDate) ||
      getValue(record.DocDate) ||
      null,
    description: getValue(record.Description) || "",
    vendor: getValue(record.Vendor) || getValue(record.VendorName) || null,
    customer: getValue(record.Customer) || getValue(record.CustomerName) || null,
    status: getValue(record.Status) || null,
    type: getValue(record.Type) || null,
    external_ref: getValue(record.PaymentRef) || getValue(record.DocumentRef) || null,
    cash_account: getValue(record.CashAccount) || null,
    cleared: getBoolValue(record.Cleared),
    reconciled: getBoolValue(record.Reconciled),
    _original: record,
  };
}

// ============================================================================
// AI Decision Step
// ============================================================================

async function runAIDecision(
  bankTxn: ParsedBankTransaction,
  candidates: ReconciliationCandidate[],
  executionId: string,
  progress?: { index: number; total: number }
): Promise<EnrichedAIDecision> {
  "use step";
  const startTime = Date.now();

  if (progress) {
    const percent = Math.min(
      95,
      55 + Math.round((progress.index / Math.max(progress.total, 1)) * 38)
    );
    await writeProgressEvent(
      BANK_RECON_STEPS.AI_DECISION,
      `Analyzing transaction ${progress.index + 1} of ${progress.total} (ID ${bankTxn.tranId})`,
      percent
    );
  }

  wf.log(WORKFLOW_NAME, "Running AI decision via AI Gateway", {
    tranId: bankTxn.tranId,
    amount: bankTxn.amount,
    candidatesCount: candidates.length,
  });

  const prompt = buildReconciliationPrompt(bankTxn, candidates);

  // Use AI SDK with Vercel AI Gateway for structured output
  const response = await generateStructuredOutput(
    prompt,
    AIDecisionResponseSchema,
    {
      temperature: 0.1,
      maxTokens: 2000,
      system:
        "You are an expert bank reconciliation accountant. Your task is to analyze bank transactions and match them with ERP candidates. Your decisions will be audited for accuracy.",
    }
  );

  let decision: AIDecisionResponse;

  if (response.success && response.object) {
    // AI SDK with generateObject returns typed, validated objects directly
    // Cast to AIDecisionResponse since the Zod schema produces compatible output
    decision = response.object as AIDecisionResponse;
    wf.log(WORKFLOW_NAME, "AI Gateway returned structured decision", {
      model: response.model,
      suggestedAction: decision.suggested_action,
    });
  } else {
    wf.log(WORKFLOW_NAME, "AI Gateway call failed, defaulting to manual_review", {
      error: response.error,
    });
    decision = getDefaultDecision(response.error || "AI Gateway service failed");
  }

  // Find the matched candidate
  let matchedCandidate: ReconciliationCandidate | null = null;
  if (decision.matched_candidate_id) {
    matchedCandidate =
      candidates.find((c) => c.id === decision.matched_candidate_id) || null;
  }

  const durationMs = Date.now() - startTime;
  wf.log(WORKFLOW_NAME, "AI decision complete", {
    suggestedAction: decision.suggested_action,
    confidence: decision.confidence_score,
    matchedId: decision.matched_candidate_id,
    durationMs,
  });

  const enriched: EnrichedAIDecision = {
    ...decision,
    bank_transaction: bankTxn,
    matched_candidate: matchedCandidate,
    timestamp: new Date().toISOString(),
    workflow_execution_id: executionId,
    llm_tokens_used: 0,
    llm_cost_estimate: 0,
  };

  if (
    enriched.suggested_action === SUGGESTED_ACTIONS.AUTO_RECONCILE &&
    !enriched.matched_candidate
  ) {
    enriched.suggested_action = SUGGESTED_ACTIONS.MANUAL_REVIEW;
    enriched.flag_for_review = true;
    enriched.flag_reasons = [
      ...(enriched.flag_reasons ?? []),
      "auto_reconcile requires a matched candidate",
    ];
  }

  return enriched;
}

function getDefaultDecision(reason: string): AIDecisionResponse {
  return {
    matched_candidate_id: null,
    matched_source_type: null,
    matched_reference_nbr: null,
    confidence_score: 0,
    reasoning: reason,
    match_factors: {
      amount_match: "mismatch",
      amount_difference: 0,
      amount_difference_percent: 0,
      estimated_processing_fee: 0,
      date_match: "suspicious",
      days_difference: 0,
      type_alignment: false,
      reference_match: false,
      vendor_customer_match: false,
      description_similarity: "none",
    },
    flag_for_review: true,
    flag_reasons: [reason],
    suggested_action: "manual_review",
    transaction_category: "other",
    risk_level: "high",
  };
}

function buildReconciliationPrompt(
  bankTxn: ParsedBankTransaction,
  candidates: ReconciliationCandidate[]
): string {
  const mappedBankTxn = {
    amount: bankTxn.amount || 0,
    date: bankTxn.tranDate,
    description: bankTxn.description || "",
    merchant_name: bankTxn.description || "",
    reference: bankTxn.extRefNbr || "",
    transaction_id: bankTxn.tranId || bankTxn.extRefNbr || "",
    drCr: bankTxn.drCr || "",
    entryType: bankTxn.entryType || "",
  };

  const candidatesList =
    candidates.length === 0
      ? "NO CANDIDATES AVAILABLE"
      : candidates
          .slice(0, 50)
          .map(
            (c, i) => `
[${i + 1}] ${c.source_type} | ID: ${c.id}
    Amount: $${Math.abs(c.amount).toFixed(2)} | Date: ${c.date?.split("T")[0] || "N/A"}
    Description: ${c.description || "N/A"}
    Reference #: ${c.reference_nbr || "N/A"} | External Ref: ${c.external_ref || "N/A"}
    Vendor: ${c.vendor || "N/A"} | Customer: ${c.customer || "N/A"}
    Status: ${c.status || "N/A"}`
          )
          .join("\n") +
        (candidates.length > 50
          ? `\n... and ${candidates.length - 50} more candidates`
          : "");

  return `You are a senior bank reconciliation accountant with 20 years of experience. Your task is to match a bank transaction against candidate entries from our ERP system (Acumatica).

=== BANK TRANSACTION ===
Amount: $${Math.abs(mappedBankTxn.amount).toFixed(2)} (${mappedBankTxn.drCr === "Disbursement" ? "OUTFLOW - money left the bank" : "INFLOW - money entered the bank"})
Date: ${mappedBankTxn.date}
Description: "${mappedBankTxn.description}"
Bank Reference: "${mappedBankTxn.reference}"
Transaction ID: ${mappedBankTxn.transaction_id}

=== CANDIDATE ENTRIES FROM ERP (${candidates.length} records) ===
${candidatesList}

=== MATCHING RULES ===

AMOUNT MATCHING (Context-Aware):
1. EXACT MATCH (Difference ≤ $0.10): Highest confidence for direct payments, transfers
2. PROCESSING FEE VARIANCE FOR OUTFLOWS (AP Bills, AP Payments): Bank > ERP by 2-4% + ~$0.30
3. PROCESSING FEE VARIANCE FOR INFLOWS (AR Invoices, AR Payments): Bank < ERP by 2-4%
4. BANK FEES & CHARGES ($5-$75): Usually NO matching ERP candidate
5. BANK INTEREST: Usually NO matching ERP candidate
6. CLOSE MATCH ($0.10 - $2.00): Requires manual_review
7. MISMATCH (>4% AND >$2.00): Cannot auto-reconcile

DATE MATCHING:
- EXACT or ±1 day = High confidence
- ±2-5 days = Normal (processing delays)
- ±6-14 days = Acceptable for credit card batches
- >14 days = Flag for review

TRANSACTION TYPE ALIGNMENT (CRITICAL):
- Bank OUTFLOW (Disbursement) → AP Bills, AP Payments, Cash Transactions (disbursements)
- Bank INFLOW (Receipt) → AR Invoices, AR Payments, Cash Transactions (receipts)
- Transfers, bank fees, and cash adjustments → CashTransaction when no AP/AR match fits

=== DECISION MATRIX ===

**auto_reconcile** (Confidence ≥ 0.90):
✓ Amount: Exact (≤$0.10) OR valid processing fee variance
✓ Date: Within 14 days
✓ Type: Correctly aligned
✓ Identity: Reference/invoice match OR vendor/customer in description
✓ Uniqueness: Only ONE viable candidate
✓ Amount: Transaction ≤ $10,000

**manual_review** (Confidence 0.50 - 0.89):
- Multiple candidates with similar amounts
- Amount variance doesn't fit fee patterns
- High-value transaction >$10,000
- Contains: "reversal", "refund", "chargeback", "adjustment"

**create_new_entry** (Confidence < 0.50 OR no candidates):
- Zero viable matches
- Bank fee or service charge (no ERP record expected)
- Bank interest income

=== RESPONSE FORMAT ===

Respond with ONLY valid JSON:

{
  "matched_candidate_id": "exact id from candidate list or null if no match",
  "matched_source_type": "APBill|APPayment|ARInvoice|ARPayment|CashTransaction|null",
  "matched_reference_nbr": "reference number from matched candidate or null",
  "confidence_score": 0.00,
  "reasoning": "2-3 sentences explaining your match decision",
  "match_factors": {
    "amount_match": "exact|processing_fee_outflow|processing_fee_inflow|close|mismatch",
    "amount_difference": 0.00,
    "amount_difference_percent": 0.00,
    "estimated_processing_fee": 0.00,
    "date_match": "exact|normal|delayed|suspicious",
    "days_difference": 0,
    "type_alignment": true,
    "reference_match": false,
    "vendor_customer_match": false,
    "description_similarity": "strong|partial|none"
  },
  "flag_for_review": false,
  "flag_reasons": [],
  "suggested_action": "auto_reconcile|manual_review|create_new_entry",
  "transaction_category": "vendor_payment|customer_receipt|payroll|transfer|bank_fee|bank_interest|cc_processing_fee|other",
  "risk_level": "low|medium|high"
}`;
}

// ============================================================================
// Insert & Update Steps
// ============================================================================

async function insertReconDecision(
  organizationId: string,
  decision: EnrichedAIDecision,
  bankTxn: ParsedBankTransaction
): Promise<string> {
  "use step";
  const startTime = Date.now();
  wf.log(WORKFLOW_NAME, "Inserting recon decision", {
    tranId: bankTxn.tranId,
    suggestedAction: decision.suggested_action,
  });

  const payload = {
    organization_id: organizationId,
    source: "bank",
    tran_id: String(bankTxn.tranId ?? bankTxn.extRefNbr),
    company_id: bankTxn.companyId || "Platinum",
    amount: Math.abs(Number(bankTxn.amount)),
    tran_date: bankTxn.tranDate,
    description: bankTxn.description || "",
    ext_ref_nbr: bankTxn.extRefNbr || "",
    matched_doc_type: decision.matched_source_type || null,
    matched_ref_nbr: decision.matched_reference_nbr || null,
    matched_candidate_id: decision.matched_candidate_id || null,
    confidence: Math.round(decision.confidence_score * 100),
    suggested_action: decision.suggested_action,
    flag_for_review: decision.flag_for_review,
    reasoning: decision.reasoning || "",
    status: RECON_DECISION_STATUS.PENDING,
    workflow_version: BANK_RECON_VERSIONS.WORKFLOW_VERSION,
    prompt_version: BANK_RECON_VERSIONS.PROMPT_VERSION,
    gpt_response: JSON.parse(JSON.stringify(decision)),
    bank_transaction: JSON.parse(JSON.stringify(bankTxn)),
  };

  const { data, error } = await finopsDb.insertReconDecision(payload);

  const durationMs = Date.now() - startTime;

  if (error || !data) {
    wf.log(WORKFLOW_NAME, "Failed to insert recon decision", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    throw new Error(
      `Failed to insert recon decision: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  wf.log(WORKFLOW_NAME, "Recon decision inserted", {
    decisionId: (data as { id: string }).id,
    durationMs,
  });

  return (data as { id: string }).id;
}

async function updateBankTransactionInAcumatica(
  organizationId: string,
  bankTxn: ParsedBankTransaction,
  decision: EnrichedAIDecision
): Promise<void> {
  "use step";
  const startTime = Date.now();
  wf.log(WORKFLOW_NAME, "Updating bank transaction in Acumatica", {
    tranId: bankTxn.tranId,
    matchedCandidate: decision.matched_candidate_id,
  });

  const matchedCandidate = decision.matched_candidate;
  if (!matchedCandidate) {
    throw new Error("No matched candidate found for auto_reconcile");
  }

  const docType = matchedCandidate.source_type;
  const { module, matchType, businessAccount } = resolveMatchModuleFields(
    docType,
    matchedCandidate
  );

  const matchPayload = {
    CashAccount: { value: bankTxn.cashAccount || "1000" },
    ExtRefNbr: { value: bankTxn.extRefNbr },
    MatchDetails: [
      {
        Matched: { value: true },
        Module: { value: module },
        MatchType: { value: matchType },
        InvoiceNbr: { value: matchedCandidate.reference_nbr || "" },
        BusinessAccount: { value: businessAccount },
      },
    ],
  };

  const client = createAcumaticaClient();
  await client.updateBankTransactionMatch({ organizationId, matchPayload });

  const durationMs = Date.now() - startTime;
  wf.log(WORKFLOW_NAME, "Bank transaction updated in Acumatica", {
    extRefNbr: bankTxn.extRefNbr,
    module,
    matchType,
    durationMs,
  });
}

async function updateReconDecisionStatus(
  decisionId: string,
  decision: EnrichedAIDecision
): Promise<void> {
  "use step";
  const startTime = Date.now();
  wf.log(WORKFLOW_NAME, "Updating recon decision status to completed", {
    decisionId,
  });

  try {
    await updateReconDecisionWithRetry(decisionId, {
      status: RECON_DECISION_STATUS.COMPLETED,
      final_doc_type: decision.matched_source_type || undefined,
      final_ref_nbr: decision.matched_reference_nbr || undefined,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    wf.log(WORKFLOW_NAME, "Failed to update recon decision status", {
      decisionId,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    throw error;
  }

  const durationMs = Date.now() - startTime;

  wf.log(WORKFLOW_NAME, "Recon decision status updated", {
    decisionId,
    durationMs,
  });
}

// ============================================================================
// Main Workflow
// ============================================================================

export async function runBankReconciliation(
  input: BankReconciliationInput
): Promise<BankReconciliationResult> {
  const { organizationId, webhookPayload, callbackUrl } = input;
  const workflowStartTime = Date.now();
  const executionId = `bank-recon-${Date.now()}`;

  wf.logStart(WORKFLOW_NAME);
  wf.log(WORKFLOW_NAME, "Input", {
    organizationId,
    transactionCount: webhookPayload.Inserted?.length || 0,
  });

  await emitProgress(
    BANK_RECON_STEPS.WORKFLOW_START,
    BANK_RECON_STEP_LABELS[BANK_RECON_STEPS.WORKFLOW_START],
    0
  );

  // Parse transactions
  await emitProgress(
    BANK_RECON_STEPS.PARSE_TRANSACTIONS,
    BANK_RECON_STEP_LABELS[BANK_RECON_STEPS.PARSE_TRANSACTIONS],
    2
  );
  const parseStart = Date.now();
  const transactions = parseTransactions(webhookPayload);
  await emitStepComplete(
    BANK_RECON_STEPS.PARSE_TRANSACTIONS,
    Date.now() - parseStart,
    true
  );

  if (transactions.length === 0) {
    wf.log(WORKFLOW_NAME, "No valid transactions to process");
    const emptyResult: BankReconciliationResult = {
      organizationId,
      transactionCount: 0,
      processedCount: 0,
      autoReconciledCount: 0,
      manualReviewCount: 0,
      newEntryCount: 0,
      errorCount: 0,
      transactions: [],
      timestamp: new Date().toISOString(),
    };
    logResult(emptyResult);
    await emitResult(emptyResult);
    return emptyResult;
  }

  // Group transactions by organization ID to fetch candidates per org
  const txnsByOrg = new Map<string, ParsedBankTransaction[]>();
  for (const txn of transactions) {
    const orgId = txn.organizationId;
    // Skip transactions without organizationId (defensive check - parseTransactions should filter these)
    if (!orgId) {
      continue;
    }
    if (!txnsByOrg.has(orgId)) {
      txnsByOrg.set(orgId, []);
    }
    txnsByOrg.get(orgId)!.push(txn);
  }

  // Fetch candidates for each organization (cached per org)
  await emitProgress(
    BANK_RECON_STEPS.MERGE_CANDIDATES,
    BANK_RECON_STEP_LABELS[BANK_RECON_STEPS.MERGE_CANDIDATES],
    8
  );
  const fetchStart = Date.now();
  const candidatesByOrg = new Map<string, ReconciliationCandidate[]>();
  for (const orgId of txnsByOrg.keys()) {
    const candidates = await fetchAllCandidates(orgId);
    candidatesByOrg.set(orgId, candidates);
  }
  await emitStepComplete(
    BANK_RECON_STEPS.MERGE_CANDIDATES,
    Date.now() - fetchStart,
    true
  );

  // Process each transaction
  const results: BankReconciliationTransactionResult[] = [];
  let autoReconciledCount = 0;
  let manualReviewCount = 0;
  let newEntryCount = 0;
  let errorCount = 0;

  let processedIndex = 0;
  for (const txn of transactions) {
    const txnOrgId = txn.organizationId;
    // Skip transactions without organizationId (defensive check - should be filtered earlier)
    if (!txnOrgId) {
      continue;
    }
    const candidates = candidatesByOrg.get(txnOrgId) || [];

    try {
      const decision = await runAIDecision(txn, candidates, executionId, {
        index: processedIndex,
        total: transactions.length,
      });

      const decisionId = await insertReconDecision(txnOrgId, decision, txn);

      if (decision.suggested_action === SUGGESTED_ACTIONS.AUTO_RECONCILE) {
        await updateBankTransactionInAcumatica(txnOrgId, txn, decision);
        await updateReconDecisionStatus(decisionId, decision);

        autoReconciledCount++;
      } else if (decision.suggested_action === SUGGESTED_ACTIONS.MANUAL_REVIEW) {
        manualReviewCount++;
      } else {
        newEntryCount++;
      }

      results.push({
        tranId: txn.tranId,
        extRefNbr: txn.extRefNbr,
        amount: txn.amount,
        suggestedAction: decision.suggested_action,
        confidence: decision.confidence_score,
        matchedDocType: decision.matched_source_type,
        matchedRefNbr: decision.matched_reference_nbr,
        decisionId,
        success: true,
      });
      processedIndex += 1;
    } catch (error) {
      wf.log(WORKFLOW_NAME, "Error processing transaction", {
        tranId: txn.tranId,
        error: error instanceof Error ? error.message : String(error),
      });

      errorCount++;
      results.push({
        tranId: txn.tranId,
        extRefNbr: txn.extRefNbr,
        amount: txn.amount,
        suggestedAction: "error",
        confidence: 0,
        matchedDocType: null,
        matchedRefNbr: null,
        decisionId: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      processedIndex += 1;
    }
  }

  // Build final result
  const finalResult: BankReconciliationResult = {
    organizationId,
    transactionCount: transactions.length,
    processedCount: results.length,
    autoReconciledCount,
    manualReviewCount,
    newEntryCount,
    errorCount,
    transactions: results,
    timestamp: new Date().toISOString(),
  };

  logResult(finalResult);

  await emitProgress(
    BANK_RECON_STEPS.WORKFLOW_COMPLETE,
    BANK_RECON_STEP_LABELS[BANK_RECON_STEPS.WORKFLOW_COMPLETE],
    100
  );
  await emitResult(finalResult);
  await closeWorkflowStream();

  // Fire-and-forget: POST result to callback URL if provided
  if (callbackUrl) {
    await postResultToCallback(callbackUrl, finalResult);
  }

  const totalDuration = Date.now() - workflowStartTime;
  wf.logComplete(WORKFLOW_NAME, errorCount === 0 ? "success" : "partial");
  wf.log(WORKFLOW_NAME, "Workflow completed", {
    totalDurationMs: totalDuration,
    hasCallback: !!callbackUrl,
    ...summarizeResultForLog(finalResult),
  });

  return finalResult;
}
