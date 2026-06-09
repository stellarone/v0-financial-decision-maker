import { BankReconciliationPageClient } from "@/components/reconciliation/bank-reconciliation-page-client"
import {
  computeReconMetrics,
  getReconDecisions,
} from "@/lib/services/app/data/get-recon-decisions"
import { withOrgAuth } from "@/lib/services/app/auth/guards"

export default async function BankReconciliationPage() {
  const ctx = await withOrgAuth()
  const organizationId = ctx.organization.id

  const decisions = organizationId
    ? await getReconDecisions(organizationId)
    : []
  const metrics = computeReconMetrics(decisions)

  return (
    <BankReconciliationPageClient
      initialDecisions={decisions}
      initialMetrics={metrics}
      organizationId={organizationId}
    />
  )
}
