/**
 * Bank Reconciliation Workflow API (interactive)
 *
 * POST — starts workflow; returns run id + transaction count (202).
 * Poll GET /api/workflows/bank-reconciliation/stream?runId=&startIndex= for NDJSON.
 */

import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { prepareBankReconciliationRun } from "@/lib/bank-reconciliation/prepare-run";
import {
  resolveWorkflowRunId,
  type WorkflowRunHandle,
} from "@/lib/bank-reconciliation/stream-response";
import {
  assertBankReconWorkflowStreamSigningReady,
  createBankReconWorkflowStreamToken,
} from "@/lib/bank-reconciliation/workflow-run-org";
import { tryOrgAuth } from "@/lib/services/app/auth/guards";
import { runBankReconciliation } from "@/lib/workflows/bank-reconciliation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const auth = await tryOrgAuth();

  if (!auth?.organization.id) {
    return NextResponse.json(
      { error: "No organization linked to the authenticated user." },
      { status: 401 }
    );
  }

  const organizationId = auth.organization.id;

  try {
    const prepared = await prepareBankReconciliationRun(organizationId);

    if (!prepared) {
      return NextResponse.json(
        {
          error: "no_transactions",
          message:
            "No unprocessed bank transactions found in Acumatica for your company.",
        },
        { status: 404 }
      );
    }

    assertBankReconWorkflowStreamSigningReady();

    console.log("[bank-reconciliation] Starting interactive workflow", {
      organizationId,
      transactionCount: prepared.transactionCount,
    });

    const run = (await start(runBankReconciliation, [
      prepared.input,
    ])) as WorkflowRunHandle;

    const runId = resolveWorkflowRunId(run);
    const streamToken = createBankReconWorkflowStreamToken(
      runId,
      organizationId
    );
    void run.returnValue.catch(() => {
      // Prevent unhandled rejections when the client disconnects early.
    });

    return NextResponse.json(
      {
        runId,
        streamToken,
        transactionCount: prepared.transactionCount,
      },
      {
        status: 202,
        headers: {
          "X-Workflow-Run-Id": runId,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start workflow";
    console.error("[bank-reconciliation] POST error", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
