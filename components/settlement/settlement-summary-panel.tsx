"use client"

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import type { ReconciliationSummary } from "@/data/types/settlement-reconciliation"
import { cn } from "@/lib/utils"

interface SettlementSummaryPanelProps {
  summary: ReconciliationSummary
  canRelease: boolean
  onRelease: () => void
  isReleasing: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function SettlementSummaryPanel({
  summary,
  canRelease,
  onRelease,
  isReleasing,
}: SettlementSummaryPanelProps) {
  return (
    <div className="sticky top-6 flex w-[320px] shrink-0 flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Reconciliation Summary
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Running math for this payout batch
        </p>
      </div>

      <div className="flex flex-col gap-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Matched payments (gross)</span>
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(summary.matchedPaymentsGross)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Processor fees (to book)</span>
          <span className="font-mono font-medium text-adz-red">
            −{formatCurrency(summary.processorFees)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Adjustments / exceptions resolved
          </span>
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(summary.adjustmentsResolved)}
          </span>
        </div>

        <div className="my-1 border-t border-border" />

        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Reconciled total</span>
          <span className="font-mono font-semibold text-foreground">
            {formatCurrency(summary.reconciledTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Payout control total</span>
          <span className="font-mono text-muted-foreground">
            {formatCurrency(summary.payoutNetControlTotal)}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
          summary.isBalanced
            ? "border-adz-green/30 bg-adz-green-dim text-adz-green"
            : "border-adz-amber/30 bg-adz-amber-dim text-adz-amber"
        )}
      >
        {summary.isBalanced ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">Balanced ✓</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Out of balance by {formatCurrency(Math.abs(summary.variance))}
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onRelease}
        disabled={!canRelease || isReleasing}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-adz-blue px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-adz-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isReleasing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        Review & Release Deposit
      </button>

      {!canRelease && (
        <p className="text-center text-[11px] text-muted-foreground">
          Accept all review items and resolve exceptions to enable release.
        </p>
      )}
    </div>
  )
}
