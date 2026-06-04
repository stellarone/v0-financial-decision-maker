/**
 * Resume / poll NDJSON events for an in-flight bank reconciliation run.
 *
 * GET ?runId=...&startIndex=0
 */

import { NextResponse } from "next/server";
import { getRun } from "workflow/api";
import { verifyBankReconWorkflowStreamToken } from "@/lib/bank-reconciliation/workflow-run-org";
import { tryOrgAuth } from "@/lib/services/app/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export async function GET(request: Request) {
  const auth = await tryOrgAuth();
  if (!auth?.organization.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId")?.trim();
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const startIndexParam = searchParams.get("startIndex");
  const startIndex = startIndexParam
    ? Number.parseInt(startIndexParam, 10)
    : undefined;

  if (
    startIndexParam != null &&
    (startIndex === undefined || Number.isNaN(startIndex) || startIndex < 0)
  ) {
    return NextResponse.json({ error: "Invalid startIndex" }, { status: 400 });
  }

  const streamToken = searchParams.get("streamToken")?.trim();
  if (!streamToken) {
    return NextResponse.json({ error: "streamToken is required" }, { status: 400 });
  }

  if (
    !verifyBankReconWorkflowStreamToken(
      runId,
      auth.organization.id,
      streamToken
    )
  ) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  try {
    const run = getRun(runId);
    const readable =
      startIndex !== undefined
        ? run.getReadable({ startIndex })
        : run.getReadable();

    if (!readable) {
      return NextResponse.json(
        { error: "No stream available for this run" },
        { status: 404 }
      );
    }

    return new Response(readable, { headers: STREAM_HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read workflow stream";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
