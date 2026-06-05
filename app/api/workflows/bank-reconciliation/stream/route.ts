/**
 * Resume / poll NDJSON events for an in-flight bank reconciliation run.
 *
 * GET ?runId=...&startIndex=0
 */

import { NextResponse } from "next/server";
import { getRun } from "workflow/api";
import { tryOrgAuth } from "@/lib/services/app/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

function createErrorLine(message: string): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      type: "error",
      data: { message, retryable: false },
      timestamp: new Date().toISOString(),
    }) + "\n"
  );
}

function wrapWorkflowReadable(
  readable: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = readable.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to read workflow stream";
        console.error("[bank-reconciliation] Workflow stream read failed", {
          message,
        });
        controller.enqueue(createErrorLine(message));
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
}

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

  try {
    const run = getRun(runId);
    if (!(await run.exists)) {
      return NextResponse.json(
        { error: "Workflow run not found" },
        { status: 404 }
      );
    }

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

    return new Response(wrapWorkflowReadable(readable), {
      headers: STREAM_HEADERS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read workflow stream";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
