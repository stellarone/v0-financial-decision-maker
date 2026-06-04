import { start } from "workflow/api";
import { runBankReconciliation } from "@/lib/workflows/bank-reconciliation";
import { prepareBankReconciliationRun } from "@/lib/bank-reconciliation/prepare-run";
import {
  resolveWorkflowRunId,
  type WorkflowRunHandle,
} from "@/lib/bank-reconciliation/stream-response";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BankReconOrgSummary {
  organizationId: string;
  transactionCount: number;
  runId: string;
  status: string;
}

export async function runBankReconciliationForOrganizations(
  organizationIds: string[]
): Promise<{
  runIds: string[];
  organizations: BankReconOrgSummary[];
}> {
  for (const orgId of organizationIds) {
    if (!UUID_REGEX.test(orgId)) {
      throw new Error(`Invalid organization ID format: ${orgId}`);
    }
  }

  const runIds: string[] = [];
  const summaries: BankReconOrgSummary[] = [];

  for (const organizationId of organizationIds) {
    const prepared = await prepareBankReconciliationRun(organizationId);

    if (!prepared) {
      summaries.push({
        organizationId,
        transactionCount: 0,
        runId: `bank-recon-noop-${Date.now()}`,
        status: "noop",
      });
      continue;
    }

    console.log("[bank-reconciliation] Starting scheduled workflow", {
      organizationId,
      transactionCount: prepared.transactionCount,
    });

    const run = (await start(runBankReconciliation, [
      prepared.input,
    ])) as WorkflowRunHandle;
    const runId = resolveWorkflowRunId(run);
    runIds.push(runId);

    summaries.push({
      organizationId,
      transactionCount: prepared.transactionCount,
      runId,
      status: "accepted",
    });
  }

  return { runIds, organizations: summaries };
}
