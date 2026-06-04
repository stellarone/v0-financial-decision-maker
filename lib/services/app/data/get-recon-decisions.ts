import { finopsDb } from "@/lib/services/finops-db"
import type {
  ReconDecisionMetrics,
  ReconDecisionRow,
} from "@/data/types/bank-reconciliation-ui"
import {
  RECON_DECISION_STATUS,
  SUGGESTED_ACTIONS,
} from "@/data/constants/bank-reconciliation"

export async function getReconDecisions(
  organizationId: string
): Promise<ReconDecisionRow[]> {
  try {
    const { data, error } = await finopsDb.listReconDecisions(organizationId, {
      limit: 200,
    })

    if (error) {
      console.error("[getReconDecisions] Error fetching decisions:", error)
      return []
    }

    return (data ?? []) as unknown as ReconDecisionRow[]
  } catch (err) {
    console.error("[getReconDecisions] Unexpected error:", err)
    return []
  }
}

export function computeReconMetrics(
  decisions: ReconDecisionRow[]
): ReconDecisionMetrics {
  return {
    total: decisions.length,
    autoReconciled: decisions.filter(
      (d) => d.suggested_action === SUGGESTED_ACTIONS.AUTO_RECONCILE
    ).length,
    manualReview: decisions.filter(
      (d) => d.suggested_action === SUGGESTED_ACTIONS.MANUAL_REVIEW
    ).length,
    createNewEntry: decisions.filter(
      (d) => d.suggested_action === SUGGESTED_ACTIONS.CREATE_NEW_ENTRY
    ).length,
    completed: decisions.filter(
      (d) => d.status === RECON_DECISION_STATUS.COMPLETED
    ).length,
    pending: decisions.filter(
      (d) => d.status === RECON_DECISION_STATUS.PENDING
    ).length,
    failed: decisions.filter(
      (d) => d.status === RECON_DECISION_STATUS.FAILED
    ).length,
  }
}
