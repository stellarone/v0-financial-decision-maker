import { CANDIDATE_SOURCE_TYPES } from "@/data/constants/bank-reconciliation";

export interface MatchModuleFields {
  module: string;
  matchType: string;
  businessAccount: string;
}

const KNOWN_SOURCE_TYPES = new Set<string>(Object.values(CANDIDATE_SOURCE_TYPES));

export function assertKnownCandidateSourceType(sourceType: string): void {
  if (!KNOWN_SOURCE_TYPES.has(sourceType)) {
    throw new Error(`Unsupported matched source type: ${sourceType}`);
  }
}

export function resolveMatchModuleFields(
  sourceType: string,
  candidate: {
    vendor?: string | null;
    customer?: string | null;
  } | null
): MatchModuleFields {
  assertKnownCandidateSourceType(sourceType);

  let module = "";
  let matchType = "";
  let businessAccount = "";

  if (sourceType === CANDIDATE_SOURCE_TYPES.AP_BILL) {
    module = "AP";
    matchType = "Bill";
    businessAccount = candidate?.vendor || "";
  } else if (sourceType === CANDIDATE_SOURCE_TYPES.AP_PAYMENT) {
    module = "AP";
    matchType = "Check";
    businessAccount = candidate?.vendor || "";
  } else if (sourceType === CANDIDATE_SOURCE_TYPES.AR_INVOICE) {
    module = "AR";
    matchType = "Invoice";
    businessAccount = candidate?.customer || "";
  } else if (sourceType === CANDIDATE_SOURCE_TYPES.AR_PAYMENT) {
    module = "AR";
    matchType = "Payment";
    businessAccount = candidate?.customer || "";
  } else if (sourceType === CANDIDATE_SOURCE_TYPES.CASH_TRANSACTION) {
    module = "CA";
    matchType = "Transaction";
    businessAccount =
      candidate?.vendor || candidate?.customer || "";
  }

  if (!module || !matchType) {
    throw new Error(`Unsupported matched source type: ${sourceType}`);
  }

  return { module, matchType, businessAccount };
}
