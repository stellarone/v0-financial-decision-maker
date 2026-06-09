import { finopsDb } from "@/lib/services/finops-db";

/**
 * Atomically claim a pending recon decision before any external ERP write.
 * Only one concurrent caller can succeed for a given decision row.
 */
export async function claimReconDecisionForProcessing(options: {
  decisionId: string;
  organizationId: string;
  reviewedBy: string;
}): Promise<void> {
  const { decisionId, organizationId, reviewedBy } = options;

  const { data, error } = await finopsDb.claimReconDecisionIfPending(
    decisionId,
    organizationId,
    reviewedBy
  );

  if (error) {
    throw new Error("Failed to claim decision for processing");
  }

  if (!data) {
    throw new Error(
      "Decision is already being processed or has been completed"
    );
  }
}

/** Release a processing claim when ERP work fails before completion is persisted. */
export async function releaseReconDecisionProcessingClaim(options: {
  decisionId: string;
  organizationId: string;
}): Promise<void> {
  const { decisionId, organizationId } = options;

  const { error } = await finopsDb.releaseReconDecisionProcessingClaim(
    decisionId,
    organizationId
  );

  if (error) {
    console.error(
      "[releaseReconDecisionProcessingClaim] Failed to release claim:",
      error
    );
  }
}
