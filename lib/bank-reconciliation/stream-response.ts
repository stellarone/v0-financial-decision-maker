import { wf } from "@/lib/services/workflow";
import {
  resolveWorkflowRunId,
  type WorkflowRunHandle,
} from "./workflow-run-id";
export {
  resolveWorkflowRunId,
  type WorkflowRunHandle,
} from "./workflow-run-id";

/**
 * Pipe WDK workflow stream + final return value as NDJSON for the browser.
 */
export function createWorkflowNdjsonResponse(run: WorkflowRunHandle): Response {
  const returnValuePromise = run.returnValue;
  void returnValuePromise.catch(() => {
    // Prevent unhandled rejections when the client closes early.
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let ndjsonBuffer = "";
      let terminalEventSeen = false;

      if (run.readable) {
        const reader = run.readable.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            controller.enqueue(value);

            const parsed = wf.appendChunkAndCheckTerminalEvent(
              value,
              decoder,
              ndjsonBuffer
            );
            ndjsonBuffer = parsed.buffer;

            if (parsed.terminalEventSeen) {
              terminalEventSeen = true;
              break;
            }
          }
        } catch (err) {
          console.error("[bank-reconciliation] Stream read error:", err);
        } finally {
          reader.releaseLock();
        }
      }

      if (!terminalEventSeen) {
        try {
          const result = await returnValuePromise;
          const resultEvent =
            JSON.stringify({
              type: "result",
              data: result,
              timestamp: new Date().toISOString(),
            }) + "\n";
          controller.enqueue(encoder.encode(resultEvent));
        } catch (err) {
          const errorEvent =
            JSON.stringify({
              type: "error",
              data: {
                message:
                  err instanceof Error ? err.message : "Workflow failed",
                retryable: false,
              },
              timestamp: new Date().toISOString(),
            }) + "\n";
          controller.enqueue(encoder.encode(errorEvent));
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Workflow-Run-Id": resolveWorkflowRunId(run),
    },
  });
}
