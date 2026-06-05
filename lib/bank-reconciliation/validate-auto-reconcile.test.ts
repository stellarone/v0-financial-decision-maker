import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CANDIDATE_SOURCE_TYPES, SUGGESTED_ACTIONS } from "../../data/constants/bank-reconciliation.ts";
import type {
  AIDecisionResponse,
  EnrichedAIDecision,
  ParsedBankTransaction,
  ReconciliationCandidate,
} from "../../data/types/bank-reconciliation.ts";
import {
  applyAutoReconcileGuard,
  classifyAmountMatch,
  validateAutoReconcile,
} from "./validate-auto-reconcile.ts";

function bankTxn(overrides: Partial<ParsedBankTransaction> = {}): ParsedBankTransaction {
  return {
    tranId: 1,
    tranDate: "2025-06-01",
    description: "Vendor payment",
    amount: -100,
    drCr: "Disbursement",
    entryType: null,
    extRefNbr: "EXT-1",
    processed: false,
    notificationId: "n1",
    companyId: "Platinum",
    receivedAt: "2025-06-01T00:00:00.000Z",
    cashAccount: "1000",
    organizationId: "org-1",
    originalTransaction: {} as ParsedBankTransaction["originalTransaction"],
    ...overrides,
  };
}

function candidate(overrides: Partial<ReconciliationCandidate> = {}): ReconciliationCandidate {
  return {
    source_type: CANDIDATE_SOURCE_TYPES.AP_BILL,
    id: "cand-1",
    reference_nbr: "BILL-001",
    amount: 100,
    date: "2025-06-01",
    description: "Vendor bill",
    vendor: "ACME",
    customer: null,
    status: "Open",
    type: null,
    external_ref: null,
    cash_account: null,
    cleared: null,
    reconciled: null,
    _original: {},
    ...overrides,
  };
}

function aiDecision(overrides: Partial<AIDecisionResponse> = {}): AIDecisionResponse {
  return {
    matched_candidate_id: "cand-1",
    matched_source_type: CANDIDATE_SOURCE_TYPES.AP_BILL,
    matched_reference_nbr: "BILL-001",
    confidence_score: 0.95,
    reasoning: "Exact match",
    match_factors: {
      amount_match: "exact",
      amount_difference: 0,
      amount_difference_percent: 0,
      estimated_processing_fee: 0,
      date_match: "exact",
      days_difference: 0,
      type_alignment: true,
      reference_match: true,
      vendor_customer_match: true,
      description_similarity: "strong",
    },
    flag_for_review: false,
    flag_reasons: [],
    suggested_action: SUGGESTED_ACTIONS.AUTO_RECONCILE,
    transaction_category: "vendor_payment",
    risk_level: "low",
    ...overrides,
  };
}

describe("classifyAmountMatch", () => {
  it("treats sub-ten-cent difference as exact", () => {
    assert.equal(classifyAmountMatch(-100, 100.05, "Disbursement"), "exact");
  });
});

describe("validateAutoReconcile", () => {
  it("allows a unique exact AP disbursement match", () => {
    const result = validateAutoReconcile(
      bankTxn(),
      aiDecision(),
      [candidate()],
      candidate()
    );
    assert.equal(result.allowed, true);
    assert.equal(result.reasons.length, 0);
  });

  it("blocks auto_reconcile when multiple viable candidates exist", () => {
    const result = validateAutoReconcile(
      bankTxn(),
      aiDecision({ matched_candidate_id: "cand-1" }),
      [
        candidate({ id: "cand-1", reference_nbr: "BILL-001" }),
        candidate({ id: "cand-2", reference_nbr: "BILL-002" }),
      ],
      candidate()
    );
    assert.equal(result.allowed, false);
    assert.ok(result.reasons.some((r) => r.includes("viable candidates")));
  });

  it("blocks prompt-injection steering to wrong candidate metadata", () => {
    const result = validateAutoReconcile(
      bankTxn(),
      aiDecision({
        matched_source_type: CANDIDATE_SOURCE_TYPES.AR_INVOICE,
        matched_reference_nbr: "INV-FAKE",
      }),
      [candidate()],
      candidate()
    );
    assert.equal(result.allowed, false);
    assert.ok(
      result.reasons.some(
        (r) =>
          r.includes("matched_source_type") || r.includes("matched_reference_nbr")
      )
    );
  });

  it("blocks high-confidence auto_reconcile on amount mismatch", () => {
    const result = validateAutoReconcile(
      bankTxn({ amount: -100 }),
      aiDecision({ confidence_score: 0.99 }),
      [candidate({ amount: 500 })],
      candidate({ amount: 500 })
    );
    assert.equal(result.allowed, false);
    assert.ok(result.reasons.some((r) => r.includes("amount match")));
  });
});

describe("applyAutoReconcileGuard", () => {
  it("downgrades unsafe auto_reconcile before Acumatica mutation", () => {
    const enriched: EnrichedAIDecision = {
      ...aiDecision(),
      bank_transaction: bankTxn({ description: "Customer refund adjustment" }),
      matched_candidate: candidate(),
      timestamp: new Date().toISOString(),
      workflow_execution_id: "run-1",
      llm_tokens_used: 0,
      llm_cost_estimate: 0,
    };

    const guarded = applyAutoReconcileGuard(enriched, [candidate()]);
    assert.equal(guarded.suggested_action, SUGGESTED_ACTIONS.MANUAL_REVIEW);
    assert.equal(guarded.flag_for_review, true);
    assert.ok(guarded.flag_reasons.some((r) => r.includes("suspicious")));
  });
});
