import type {
  ClearingPayment,
  MatchResult,
  NormalizedSettlementLine,
  ReleasePayload,
} from "@/data/types/settlement-reconciliation"
import { generateMockClearingPayments } from "@/lib/settlement-reconciliation/mock-data"
import { matchSettlement as runMatchSettlement } from "@/lib/settlement-reconciliation/matching"

let cachedClearingPayments: ClearingPayment[] | null = null

/**
 * Data-service seam for settlement reconciliation.
 * Replace mock implementations with real ERP/Acumatica calls later.
 */
export async function getClearingAccountPayments(): Promise<ClearingPayment[]> {
  await delay(300)
  if (!cachedClearingPayments) {
    cachedClearingPayments = generateMockClearingPayments()
  }
  return cachedClearingPayments
}

export async function matchSettlement(
  lines: NormalizedSettlementLine[],
  payments: ClearingPayment[]
): Promise<MatchResult[]> {
  await delay(200)
  return runMatchSettlement(lines, payments)
}

export async function releaseDeposit(
  payload: ReleasePayload
): Promise<{ ok: boolean; depositId?: string }> {
  await delay(800)
  console.info("[settlement-service] releaseDeposit payload", payload)
  return {
    ok: true,
    depositId: `DEP-${payload.batchId}-${Date.now().toString(36).toUpperCase()}`,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
