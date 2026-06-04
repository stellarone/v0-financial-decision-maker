import { finopsDb } from "@/lib/services/finops-db";

type ReconDecisionUpdates = Parameters<typeof finopsDb.updateReconDecision>[1];

const DEFAULT_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Persist recon decision updates after ERP writes; retries transient FinOps failures.
 */
export async function updateReconDecisionWithRetry(
  decisionId: string,
  updates: ReconDecisionUpdates,
  options?: { attempts?: number }
): Promise<void> {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { error } = await finopsDb.updateReconDecision(decisionId, updates);
    if (!error) {
      return;
    }
    lastError = error;
    if (attempt < attempts) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Failed to update decision status";
  throw new Error(message);
}
