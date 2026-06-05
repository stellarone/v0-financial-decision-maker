export interface WorkflowRunHandle {
  runId?: string;
  id?: string;
  readable?: ReadableStream<Uint8Array> | null;
  returnValue: Promise<unknown>;
}

export function resolveWorkflowRunId(run: WorkflowRunHandle): string {
  const runId = run.runId ?? run.id;
  if (!runId) {
    throw new Error("Workflow start did not return a run id");
  }

  return runId;
}
