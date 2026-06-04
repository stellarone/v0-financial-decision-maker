/**
 * wf - Workflow helper utilities for Workflow DevKit
 */

import type {
  WorkflowStreamEvent,
  WorkflowStreamEventType,
} from "@/data/types/workflow";

export type WorkflowStatus = "success" | "failed" | "partial";

export class wf {
  static log(workflowName: string, message: string, data?: unknown): void {
    const prefix = `[${workflowName}] ${message}`;
    if (data !== undefined) {
      console.log(prefix, data);
    } else {
      console.log(prefix);
    }
  }

  static logStart(workflowName: string): void {
    console.log(`\n[${workflowName}] ========== Starting ==========`);
  }

  static logComplete(workflowName: string, status: WorkflowStatus): void {
    console.log(`\n[${workflowName}] ========== Complete ==========`);
    console.log(`[${workflowName}] Status: ${status}`);
  }

  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  static createStreamEvent<T>(
    type: WorkflowStreamEventType,
    data: T
  ): WorkflowStreamEvent<T> {
    return {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  static isTerminalStreamEventType(type?: string): boolean {
    return type === "result" || type === "error";
  }

  static appendChunkAndCheckTerminalEvent(
    chunk: Uint8Array,
    decoder: TextDecoder,
    buffered: string
  ): { buffer: string; terminalEventSeen: boolean } {
    const combined = buffered + decoder.decode(chunk, { stream: true });
    const lines = combined.split("\n");
    const trailing = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed) as { type?: string };
        if (this.isTerminalStreamEventType(parsed.type)) {
          return { buffer: trailing, terminalEventSeen: true };
        }
      } catch {
        // Ignore partial or non-JSON lines.
      }
    }

    return { buffer: trailing, terminalEventSeen: false };
  }
}
