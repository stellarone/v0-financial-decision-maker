"use client"

import { CheckCircle2, Loader2, X } from "lucide-react"
import type { ReleasePayload } from "@/data/types/settlement-reconciliation"

interface ReleaseDepositModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  payload: ReleasePayload | null
  isReleasing: boolean
  depositId?: string
  released: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function ReleaseDepositModal({
  open,
  onClose,
  onConfirm,
  payload,
  isReleasing,
  depositId,
  released,
}: ReleaseDepositModalProps) {
  if (!open || !payload) return null

  const resolvedExceptions = payload.exceptionResolutions.filter(
    (r) => r.acknowledged
  ).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--background) 80%, transparent)",
        }}
        onClick={released ? onClose : undefined}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {released ? "Deposit Released" : "Review & Release Deposit"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {released ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-adz-green" />
            <p className="text-sm text-foreground">
              Bank deposit posted successfully.
            </p>
            {depositId && (
              <p className="font-mono text-xs text-muted-foreground">
                Deposit ID: {depositId}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-adz-blue px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-adz-blue/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Confirm the following entries will be posted to your ERP on
              release:
            </p>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Matched payments
                </span>
                <span className="font-medium text-foreground">
                  {payload.matchedPaymentIds.length} payments totaling{" "}
                  {formatCurrency(payload.matchedPaymentsGross)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Processor fee entry
                </span>
                <span className="font-medium text-adz-red">
                  −{formatCurrency(payload.feeEntryAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Resolved exceptions
                </span>
                <span className="font-medium text-foreground">
                  {resolvedExceptions}
                </span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">
                    Bank deposit
                  </span>
                  <span className="font-mono text-lg font-bold text-adz-green">
                    {formatCurrency(payload.netDepositAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isReleasing}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isReleasing}
                className="flex items-center gap-1.5 rounded-lg bg-adz-blue px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-adz-blue/90 disabled:opacity-60"
              >
                {isReleasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isReleasing ? "Releasing…" : "Release Deposit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
