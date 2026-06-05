/**
 * Bank Reconciliation triggers
 *
 * - GET + CRON_SECRET: daily Vercel cron — all orgs with active Acumatica in etl
 * - POST (session or Bearer JWT): authenticated user's organization only
 */

import { NextRequest, NextResponse } from "next/server";
import {
  resolveBankReconOrganizationIdsForCron,
  resolveBankReconOrganizationIdsForUser,
} from "@/lib/bank-reconciliation/resolve-organizations";
import { runBankReconciliationForOrganizations } from "@/lib/bank-reconciliation/run-scheduled";

async function handleBankReconciliation(
  request: NextRequest,
  mode: "cron" | "user"
) {
  const resolved =
    mode === "cron"
      ? await resolveBankReconOrganizationIdsForCron(request)
      : await resolveBankReconOrganizationIdsForUser(request);

  if (resolved.mode === "unauthorized") {
    return NextResponse.json(
      { error: resolved.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  if (mode === "cron" && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  if (resolved.organizationIds.length === 0) {
    return NextResponse.json(
      {
        status: "accepted",
        runIds: [],
        organizations: [],
        message:
          mode === "cron"
            ? "No active Acumatica organizations found."
            : "No organization linked to the authenticated user.",
      },
      { status: 202 }
    );
  }

  const { runIds, organizations } = await runBankReconciliationForOrganizations(
    resolved.organizationIds
  );

  return NextResponse.json(
    {
      status: "accepted",
      mode,
      runIds,
      organizations,
      message: "Bank reconciliation started.",
    },
    { status: 202 }
  );
}

export async function GET(request: NextRequest) {
  try {
    return await handleBankReconciliation(request, "cron");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start scheduled workflow";
    console.error("[bank-reconciliation/scheduled] GET error", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleBankReconciliation(request, "user");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start bank reconciliation";
    console.error("[bank-reconciliation/scheduled] POST error", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
