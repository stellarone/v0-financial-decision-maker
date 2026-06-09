/**
 * Workflow stream types (NDJSON progress events)
 */

export type WorkflowStreamEventType =
  | "progress"
  | "step_complete"
  | "error"
  | "result";

export interface WorkflowStreamEvent<T = unknown> {
  type: WorkflowStreamEventType;
  timestamp: string;
  data: T;
}

export interface WorkflowProgressData {
  step: string;
  message: string;
  percent?: number;
}

export interface WorkflowStepCompleteData {
  step: string;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface WorkflowErrorData {
  message: string;
  code?: string;
  retryable?: boolean;
}
