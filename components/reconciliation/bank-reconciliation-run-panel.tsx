"use client"

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react"
import type { BankReconciliationResult } from "@/data/types/bank-reconciliation"
import {
  BANK_RECON_STEP_LABELS,
  BANK_RECON_STEPS,
} from "@/data/constants/bank-reconciliation"
import type { BankReconStreamState } from "@/lib/bank-reconciliation/consume-ndjson-stream"
import { cn } from "@/lib/utils"

const PIPELINE_STEPS = [
  BANK_RECON_STEPS.WORKFLOW_START,
  BANK_RECON_STEPS.PARSE_TRANSACTIONS,
  BANK_RECON_STEPS.MERGE_CANDIDATES,
  BANK_RECON_STEPS.AI_DECISION,
  BANK_RECON_STEPS.WORKFLOW_COMPLETE,
] as const

function stepIndex(step: string): number {
  const idx = PIPELINE_STEPS.indexOf(step as (typeof PIPELINE_STEPS)[number])
  return idx >= 0 ? idx : 2
}

function ResultSummary({ result }: { result: BankReconciliationResult }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryStat label="Processed" value={result.processedCount} />
      <SummaryStat
        label="Auto reconciled"
        value={result.autoReconciledCount}
        tone="green"
      />
      <SummaryStat
        label="Manual review"
        value={result.manualReviewCount}
        tone="amber"
      />
      <SummaryStat
        label="Errors"
        value={result.errorCount}
        tone={result.errorCount > 0 ? "red" : undefined}
      />
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "green" | "amber" | "red"
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "green" && "text-adz-green",
          tone === "amber" && "text-adz-amber",
          tone === "red" && "text-adz-red"
        )}
      >
        {value}
      </p>
    </div>
  )
}

interface BankReconciliationRunPanelProps {
  stream: BankReconStreamState
  onDismiss?: () => void
}

export function BankReconciliationRunPanel({
  stream,
  onDismiss,
}: BankReconciliationRunPanelProps) {
  if (stream.phase === "idle") return null

  const activeStep =
    stream.lines.length > 0
      ? stream.lines[stream.lines.length - 1].step
      : BANK_RECON_STEPS.WORKFLOW_START
  const activeIdx = stepIndex(activeStep)

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-live="polite"
      aria-busy={stream.phase === "running"}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              stream.phase === "running" && "bg-adz-blue/15 text-adz-blue",
              stream.phase === "success" && "bg-adz-green-dim text-adz-green",
              stream.phase === "error" && "bg-adz-red-dim text-adz-red"
            )}
          >
            {stream.phase === "running" && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {stream.phase === "success" && (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {stream.phase === "error" && <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-adz-blue" />
              {stream.phase === "running"
                ? "Reconciliation in progress"
                : stream.phase === "success"
                  ? "Reconciliation complete"
                  : "Reconciliation failed"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {stream.currentMessage}
            </p>
            {stream.phase === "running" &&
              stream.transactionCount != null &&
              stream.transactionCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {stream.processedCount != null && stream.processedCount > 0
                    ? `${stream.processedCount} of ${stream.transactionCount} transactions processed`
                    : `${stream.transactionCount} transactions in this run`}
                </p>
              )}
            {stream.runId && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                Run {stream.runId}
              </p>
            )}
          </div>
        </div>
        {stream.phase !== "running" && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{stream.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                stream.phase === "error" ? "bg-adz-red" : "bg-adz-blue"
              )}
              style={{ width: `${Math.max(stream.percent, stream.phase === "running" ? 4 : 0)}%` }}
            />
          </div>
        </div>

        <ol className="mb-4 flex flex-wrap gap-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const done = idx < activeIdx
            const current = idx === activeIdx && stream.phase === "running"
            const label = BANK_RECON_STEP_LABELS[step] ?? step
            return (
              <li
                key={step}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  done &&
                    "border-adz-green/40 bg-adz-green-dim text-adz-green",
                  current &&
                    "border-adz-blue/40 bg-adz-blue/10 text-adz-blue",
                  !done &&
                    !current &&
                    "border-border text-muted-foreground"
                )}
              >
                {label}
              </li>
            )
          })}
        </ol>

        {stream.phase === "error" && stream.error && (
          <p className="mb-3 flex items-start gap-2 text-sm text-adz-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {stream.error}
          </p>
        )}

        {stream.result && <ResultSummary result={stream.result} />}

        {stream.lines.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2 font-mono text-[11px] text-muted-foreground">
              {stream.lines.slice(-12).map((line, i) => (
                <li key={`${line.at}-${i}`} className="truncate">
                  <span className="text-foreground/70">
                    {new Date(line.at).toLocaleTimeString()}
                  </span>{" "}
                  {line.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
