import { getWritable } from "workflow";
import { wf } from "@/lib/services/workflow";
import type { WorkflowStreamEvent } from "@/data/types/workflow";

const WORKFLOW_LOG_NAME = "bank-reconciliation";

export function encodeWorkflowStreamLine<T>(event: WorkflowStreamEvent<T>): string {
  return JSON.stringify(event) + "\n";
}

/**
 * Write a progress/result line to the workflow stream.
 * Call only from within a `"use step"` function (not from the workflow orchestrator).
 */
export async function writeWorkflowStreamLine<T>(
  event: WorkflowStreamEvent<T>
): Promise<void> {
  const writable = getWritable<string>();
  const writer = writable.getWriter();
  try {
    await writer.write(encodeWorkflowStreamLine(event));
  } finally {
    writer.releaseLock();
  }
}

export async function writeProgressEvent(
  step: string,
  message: string,
  percent?: number
): Promise<void> {
  wf.log(WORKFLOW_LOG_NAME, `[${step}] ${message}`);
  await writeWorkflowStreamLine(
    wf.createStreamEvent("progress", { step, message, percent })
  );
}

export async function writeStepCompleteEvent(
  step: string,
  durationMs: number,
  success: boolean,
  error?: string
): Promise<void> {
  wf.log(WORKFLOW_LOG_NAME, `[${step}] Complete`, {
    duration_ms: durationMs,
    success,
    error,
  });
  await writeWorkflowStreamLine(
    wf.createStreamEvent("step_complete", {
      step,
      duration_ms: durationMs,
      success,
      error,
    })
  );
}

export async function writeResultEvent<T>(data: T): Promise<void> {
  await writeWorkflowStreamLine(wf.createStreamEvent("result", data));
}
