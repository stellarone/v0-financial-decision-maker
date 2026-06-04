import type { BankReconciliationResult } from "@/data/types/bank-reconciliation";
import type {
  WorkflowErrorData,
  WorkflowProgressData,
  WorkflowStreamEvent,
  WorkflowStepCompleteData,
} from "@/data/types/workflow";

export interface BankReconStreamProgressLine {
  step: string;
  message: string;
  at: number;
  percent?: number;
}

export type BankReconStreamPhase = "idle" | "running" | "success" | "error";

export interface BankReconStreamState {
  phase: BankReconStreamPhase;
  runId: string | null;
  percent: number;
  currentMessage: string;
  lines: BankReconStreamProgressLine[];
  result: BankReconciliationResult | null;
  error: string | null;
  /** Expected transactions for this run (from POST 202). */
  transactionCount: number | null;
  /** Decisions observed since run start (from table refresh). */
  processedCount: number | null;
}

export const INITIAL_BANK_RECON_STREAM_STATE: BankReconStreamState = {
  phase: "idle",
  runId: null,
  percent: 0,
  currentMessage: "",
  lines: [],
  result: null,
  error: null,
  transactionCount: null,
  processedCount: null,
};

const MAX_LINES = 40;

function pushLine(
  lines: BankReconStreamProgressLine[],
  step: string,
  message: string,
  percent?: number
): BankReconStreamProgressLine[] {
  const next = [
    ...lines,
    { step, message, at: Date.now(), percent },
  ];
  return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
}

/** Parse one NDJSON line; handles double-encoded JSON strings from some stream encoders. */
export function parseWorkflowStreamLine(
  line: string
): WorkflowStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "type" in parsed &&
      typeof (parsed as WorkflowStreamEvent).type === "string"
    ) {
      return parsed as WorkflowStreamEvent;
    }
  } catch {
    return null;
  }
  return null;
}

export function applyWorkflowStreamEvent(
  event: WorkflowStreamEvent,
  prev: BankReconStreamState
): { state: BankReconStreamState; terminal: boolean } {
  switch (event.type) {
    case "progress": {
      const data = event.data as WorkflowProgressData;
      const message = data.message ?? "Processing…";
      return {
        terminal: false,
        state: {
          ...prev,
          phase: "running",
          percent: data.percent ?? prev.percent,
          currentMessage: message,
          lines: pushLine(prev.lines, data.step ?? "progress", message, data.percent),
        },
      };
    }
    case "step_complete": {
      const data = event.data as WorkflowStepCompleteData;
      const message = data.success
        ? `Completed${data.duration_ms ? ` (${Math.round(data.duration_ms / 1000)}s)` : ""}`
        : `Failed${data.error ? `: ${data.error}` : ""}`;
      return {
        terminal: false,
        state: {
          ...prev,
          lines: pushLine(
            prev.lines,
            data.step ?? "step",
            message,
            prev.percent
          ),
        },
      };
    }
    case "error": {
      const data = event.data as WorkflowErrorData;
      return {
        terminal: true,
        state: {
          ...prev,
          phase: "error",
          error: data.message ?? "Workflow failed",
          currentMessage: data.message ?? "Workflow failed",
        },
      };
    }
    case "result": {
      return {
        terminal: true,
        state: {
          ...prev,
          phase: "success",
          percent: 100,
          result: event.data as BankReconciliationResult,
          currentMessage: "Reconciliation complete",
          processedCount:
            (event.data as BankReconciliationResult).processedCount ??
            prev.processedCount,
        },
      };
    }
    default:
      return { state: prev, terminal: false };
  }
}

/**
 * Merge decision-table progress when the workflow stream is quiet during long steps.
 */
export function mergeDecisionProgress(
  state: BankReconStreamState,
  baselineDecisionCount: number,
  currentDecisionCount: number
): BankReconStreamState {
  if (state.phase !== "running" || !state.transactionCount) {
    return state;
  }

  const newDecisions = Math.max(0, currentDecisionCount - baselineDecisionCount);
  if (newDecisions <= (state.processedCount ?? 0)) {
    return state;
  }

  const percent = Math.min(
    94,
    55 + Math.round((newDecisions / state.transactionCount) * 38)
  );
  const message = `Saved ${newDecisions} of ${state.transactionCount} decisions…`;

  return {
    ...state,
    processedCount: newDecisions,
    percent: Math.max(state.percent, percent),
    currentMessage:
      state.percent >= percent ? state.currentMessage : message,
    lines:
      state.processedCount === newDecisions
        ? state.lines
        : pushLine(state.lines, "ai_decision", message, percent),
  };
}

/**
 * Read an NDJSON body until a terminal event or the stream closes.
 */
export async function consumeWorkflowNdjsonStream(
  response: Response,
  onUpdate: (state: BankReconStreamState) => void,
  initial: BankReconStreamState = INITIAL_BANK_RECON_STREAM_STATE,
  options?: { allowPartial?: boolean }
): Promise<{ state: BankReconStreamState; eventsApplied: number }> {
  let state: BankReconStreamState = {
    ...initial,
    phase: initial.phase === "idle" ? "running" : initial.phase,
    currentMessage: initial.currentMessage || "Starting reconciliation…",
    lines:
      initial.lines.length > 0
        ? initial.lines
        : pushLine([], "workflow_start", "Starting reconciliation…", 0),
  };
  onUpdate(state);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    state = {
      ...state,
      phase: "error",
      error:
        body.message ??
        body.error ??
        `Request failed (${response.status})`,
    };
    onUpdate(state);
    return { state, eventsApplied: 0 };
  }

  if (!response.body) {
    state = {
      ...state,
      phase: "error",
      error: "No response stream received",
    };
    onUpdate(state);
    return { state, eventsApplied: 0 };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;
  let eventsApplied = 0;

  try {
    readLoop: while (!terminal) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseWorkflowStreamLine(line);
        if (!event) continue;
        eventsApplied += 1;
        const parsed = applyWorkflowStreamEvent(event, state);
        state = parsed.state;
        onUpdate(state);
        if (parsed.terminal) {
          terminal = true;
          await reader.cancel();
          break readLoop;
        }
      }
    }

    if (!terminal && buffer.trim()) {
      const event = parseWorkflowStreamLine(buffer);
      if (event) {
        eventsApplied += 1;
        const parsed = applyWorkflowStreamEvent(event, state);
        state = parsed.state;
        onUpdate(state);
        terminal = parsed.terminal;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (state.phase === "running" && !options?.allowPartial) {
    state = {
      ...state,
      phase: "error",
      error: "Stream ended before completion",
    };
    onUpdate(state);
  }

  return { state, eventsApplied };
}

/**
 * Poll the workflow stream endpoint until a terminal event or timeout.
 */
export async function pollWorkflowRunStream(
  runId: string,
  options: {
    onUpdate: (state: BankReconStreamState) => void;
    initial: BankReconStreamState;
    startIndex?: number;
    intervalMs?: number;
    signal?: AbortSignal;
  }
): Promise<BankReconStreamState> {
  const {
    onUpdate,
    initial,
    startIndex = 0,
    intervalMs = 2000,
    signal,
  } = options;

  let state = initial;
  let nextChunkIndex = startIndex;
  let idlePolls = 0;
  const maxIdlePolls = 900;

  while (state.phase === "running" && idlePolls < maxIdlePolls) {
    if (signal?.aborted) break;

    const url = new URL(
      "/api/workflows/bank-reconciliation/stream",
      window.location.origin
    );
    url.searchParams.set("runId", runId);
    if (nextChunkIndex > 0) {
      url.searchParams.set("startIndex", String(nextChunkIndex));
    }

    try {
      const res = await fetch(url.toString(), {
        credentials: "include",
        signal,
      });

      if (res.status === 404) {
        idlePolls += 1;
        await sleep(intervalMs, signal);
        continue;
      }

      if (!res.ok || !res.body) {
        idlePolls += 1;
        await sleep(intervalMs, signal);
        continue;
      }

      const { state: nextState, eventsApplied } =
        await consumeWorkflowNdjsonStream(
          res,
          onUpdate,
          state,
          { allowPartial: true }
        );
      state = nextState;

      if (eventsApplied > 0) {
        nextChunkIndex += eventsApplied;
        idlePolls = 0;
      } else {
        idlePolls += 1;
      }

      if (state.phase !== "running") {
        break;
      }
    } catch (err) {
      if (signal?.aborted) break;
      console.warn("[bank-reconciliation] stream poll failed", err);
      idlePolls += 1;
    }

    await sleep(intervalMs, signal);
  }

  return state;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}
