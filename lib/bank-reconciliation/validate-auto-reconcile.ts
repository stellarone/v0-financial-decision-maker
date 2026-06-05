import { SUGGESTED_ACTIONS, CANDIDATE_SOURCE_TYPES } from "../../data/constants/bank-reconciliation.ts";
import type {
  AIDecisionResponse,
  EnrichedAIDecision,
  ParsedBankTransaction,
  ReconciliationCandidate,
} from "../../data/types/bank-reconciliation.ts";

/** Server-enforced thresholds (mirror prompt rules; not delegated to the LLM). */
export const AUTO_RECONCILE_POLICY = {
  MIN_CONFIDENCE: 0.9,
  MAX_TRANSACTION_AMOUNT: 10_000,
  EXACT_AMOUNT_TOLERANCE: 0.1,
  CLOSE_AMOUNT_MAX_DIFF: 2,
  MAX_AMOUNT_DIFF_PERCENT: 0.04,
  PROCESSING_FEE_MIN_PERCENT: 0.02,
  PROCESSING_FEE_MAX_PERCENT: 0.04,
  MAX_DATE_DIFF_DAYS: 14,
} as const;

const AP_SOURCE_TYPES = new Set<string>([
  CANDIDATE_SOURCE_TYPES.AP_BILL,
  CANDIDATE_SOURCE_TYPES.AP_PAYMENT,
]);

const AR_SOURCE_TYPES = new Set<string>([
  CANDIDATE_SOURCE_TYPES.AR_INVOICE,
  CANDIDATE_SOURCE_TYPES.AR_PAYMENT,
]);

const SUSPICIOUS_DESCRIPTION =
  /\b(reversal|refund|chargeback|adjustment)\b/i;

export type AmountMatchKind =
  | "exact"
  | "processing_fee_outflow"
  | "processing_fee_inflow"
  | "close"
  | "mismatch";

export interface AutoReconcileValidationResult {
  allowed: boolean;
  reasons: string[];
}

export function classifyAmountMatch(
  bankAmount: number,
  candidateAmount: number,
  drCr: ParsedBankTransaction["drCr"]
): AmountMatchKind {
  const bank = Math.abs(bankAmount);
  const candidate = Math.abs(candidateAmount);
  const diff = Math.abs(bank - candidate);
  const base = Math.max(bank, candidate, 0.01);
  const percent = diff / base;

  if (diff <= AUTO_RECONCILE_POLICY.EXACT_AMOUNT_TOLERANCE) {
    return "exact";
  }

  if (drCr === "Disbursement" && bank > candidate) {
    if (
      percent >= AUTO_RECONCILE_POLICY.PROCESSING_FEE_MIN_PERCENT &&
      percent <= AUTO_RECONCILE_POLICY.PROCESSING_FEE_MAX_PERCENT
    ) {
      return "processing_fee_outflow";
    }
  }

  if (drCr === "Receipt" && bank < candidate) {
    if (
      percent >= AUTO_RECONCILE_POLICY.PROCESSING_FEE_MIN_PERCENT &&
      percent <= AUTO_RECONCILE_POLICY.PROCESSING_FEE_MAX_PERCENT
    ) {
      return "processing_fee_inflow";
    }
  }

  if (
    diff <= AUTO_RECONCILE_POLICY.CLOSE_AMOUNT_MAX_DIFF &&
    percent <= AUTO_RECONCILE_POLICY.MAX_AMOUNT_DIFF_PERCENT
  ) {
    return "close";
  }

  if (
    percent > AUTO_RECONCILE_POLICY.MAX_AMOUNT_DIFF_PERCENT &&
    diff > AUTO_RECONCILE_POLICY.CLOSE_AMOUNT_MAX_DIFF
  ) {
    return "mismatch";
  }

  return "mismatch";
}

function isAmountEligibleForAutoReconcile(kind: AmountMatchKind): boolean {
  return (
    kind === "exact" ||
    kind === "processing_fee_outflow" ||
    kind === "processing_fee_inflow"
  );
}

export function isCandidateTypeAligned(
  bankTxn: ParsedBankTransaction,
  candidate: ReconciliationCandidate
): boolean {
  if (bankTxn.drCr === "Disbursement") {
    return AP_SOURCE_TYPES.has(candidate.source_type);
  }
  if (bankTxn.drCr === "Receipt") {
    return AR_SOURCE_TYPES.has(candidate.source_type);
  }
  return false;
}

export function daysBetweenDates(left: string, right: string): number | null {
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return null;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / msPerDay);
}

function countViableCandidates(
  bankTxn: ParsedBankTransaction,
  candidates: ReconciliationCandidate[]
): number {
  let count = 0;
  for (const candidate of candidates) {
    if (!isCandidateTypeAligned(bankTxn, candidate)) {
      continue;
    }
    const amountKind = classifyAmountMatch(
      bankTxn.amount,
      candidate.amount,
      bankTxn.drCr
    );
    if (!isAmountEligibleForAutoReconcile(amountKind)) {
      continue;
    }
    if (candidate.date) {
      const days = daysBetweenDates(bankTxn.tranDate, candidate.date);
      if (days === null || days > AUTO_RECONCILE_POLICY.MAX_DATE_DIFF_DAYS) {
        continue;
      }
    }
    count += 1;
  }
  return count;
}

export function validateAutoReconcile(
  bankTxn: ParsedBankTransaction,
  decision: AIDecisionResponse,
  candidates: ReconciliationCandidate[],
  matchedCandidate: ReconciliationCandidate | null
): AutoReconcileValidationResult {
  const reasons: string[] = [];

  if (decision.suggested_action !== SUGGESTED_ACTIONS.AUTO_RECONCILE) {
    return { allowed: true, reasons: [] };
  }

  if (!matchedCandidate) {
    reasons.push("auto_reconcile requires a matched candidate from the ERP list");
    return { allowed: false, reasons };
  }

  if (decision.flag_for_review) {
    reasons.push("auto_reconcile blocked: decision flagged for review");
  }

  if (decision.risk_level !== "low") {
    reasons.push(`auto_reconcile blocked: risk_level is ${decision.risk_level}`);
  }

  if (decision.confidence_score < AUTO_RECONCILE_POLICY.MIN_CONFIDENCE) {
    reasons.push(
      `auto_reconcile blocked: confidence ${decision.confidence_score} below ${AUTO_RECONCILE_POLICY.MIN_CONFIDENCE}`
    );
  }

  const bankAmount = Math.abs(bankTxn.amount);
  if (bankAmount > AUTO_RECONCILE_POLICY.MAX_TRANSACTION_AMOUNT) {
    reasons.push("auto_reconcile blocked: transaction exceeds $10,000 limit");
  }

  if (SUSPICIOUS_DESCRIPTION.test(bankTxn.description || "")) {
    reasons.push("auto_reconcile blocked: suspicious transaction description");
  }

  if (
    decision.matched_source_type &&
    decision.matched_source_type !== matchedCandidate.source_type
  ) {
    reasons.push("auto_reconcile blocked: matched_source_type does not match candidate");
  }

  if (
    decision.matched_reference_nbr &&
    matchedCandidate.reference_nbr &&
    decision.matched_reference_nbr !== matchedCandidate.reference_nbr
  ) {
    reasons.push("auto_reconcile blocked: matched_reference_nbr does not match candidate");
  }

  if (!isCandidateTypeAligned(bankTxn, matchedCandidate)) {
    reasons.push("auto_reconcile blocked: transaction type not aligned with candidate");
  }

  const amountKind = classifyAmountMatch(
    bankTxn.amount,
    matchedCandidate.amount,
    bankTxn.drCr
  );
  if (!isAmountEligibleForAutoReconcile(amountKind)) {
    reasons.push(`auto_reconcile blocked: amount match is ${amountKind}`);
  }

  if (matchedCandidate.date) {
    const days = daysBetweenDates(bankTxn.tranDate, matchedCandidate.date);
    if (days === null) {
      reasons.push("auto_reconcile blocked: invalid candidate date");
    } else if (days > AUTO_RECONCILE_POLICY.MAX_DATE_DIFF_DAYS) {
      reasons.push(
        `auto_reconcile blocked: candidate date ${days} days from bank transaction`
      );
    }
  }

  const viableCount = countViableCandidates(bankTxn, candidates);
  if (viableCount > 1) {
    reasons.push(
      `auto_reconcile blocked: ${viableCount} viable candidates (uniqueness required)`
    );
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Downgrade unsafe auto_reconcile decisions before any Acumatica mutation.
 */
export function applyAutoReconcileGuard(
  decision: EnrichedAIDecision,
  candidates: ReconciliationCandidate[]
): EnrichedAIDecision {
  if (decision.suggested_action !== SUGGESTED_ACTIONS.AUTO_RECONCILE) {
    return decision;
  }

  const validation = validateAutoReconcile(
    decision.bank_transaction,
    decision,
    candidates,
    decision.matched_candidate
  );

  if (validation.allowed) {
    return decision;
  }

  return {
    ...decision,
    suggested_action: SUGGESTED_ACTIONS.MANUAL_REVIEW,
    flag_for_review: true,
    flag_reasons: [...(decision.flag_reasons ?? []), ...validation.reasons],
  };
}
