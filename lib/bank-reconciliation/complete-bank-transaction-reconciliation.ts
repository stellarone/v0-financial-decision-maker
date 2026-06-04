import { RECON_DECISION_STATUS } from "@/data/constants/bank-reconciliation";
import type { AcumaticaClient } from "@/lib/clients/acumatica-client";
import type { BankTransactionMatchInput } from "@/lib/clients/types";
import { updateReconDecisionWithRetry } from "@/lib/bank-reconciliation/update-recon-decision-with-retry";

type ReconDecisionCompletionUpdates = {
  final_doc_type?: string;
  final_ref_nbr?: string;
  reviewed_by?: string;
  reviewed_at?: string;
};

/**
 * Persist recon decision completion before writing the match to Acumatica so a
 * FinOps failure cannot leave ERP reconciled while the UI still shows pending.
 * Rolls the decision back to pending if the ERP write fails, or marks it failed
 * when that rollback cannot be persisted.
 */
export async function completeBankTransactionReconciliation(options: {
  decisionId: string;
  organizationId: string;
  client: AcumaticaClient;
  matchPayload: BankTransactionMatchInput["matchPayload"];
  decisionUpdates: ReconDecisionCompletionUpdates;
}): Promise<void> {
  const { decisionId, organizationId, client, matchPayload, decisionUpdates } =
    options;

  await updateReconDecisionWithRetry(decisionId, {
    status: RECON_DECISION_STATUS.COMPLETED,
    ...decisionUpdates,
  });

  try {
    await client.updateBankTransactionMatch({ organizationId, matchPayload });
  } catch (error) {
    try {
      await updateReconDecisionWithRetry(decisionId, {
        status: RECON_DECISION_STATUS.PENDING,
      });
    } catch (rollbackError) {
      try {
        await updateReconDecisionWithRetry(decisionId, {
          status: RECON_DECISION_STATUS.FAILED,
        });
      } catch (markFailedError) {
        console.error(
          "[completeBankTransactionReconciliation] Failed to revert decision after Acumatica error:",
          { rollbackError, markFailedError }
        );
      }
    }
    throw error;
  }
}
