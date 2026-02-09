"use client"

import { cn } from "@/lib/utils"
import { X, ArrowUpRight, ArrowDownLeft, Check, Clock } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { ExecutionItem } from "@/lib/types"

interface ExecutionDrawerProps {
  item: ExecutionItem | null
  onClose: () => void
}

function statusToBadge(
  status: string
): "scheduled" | "pending" | "executing" | "completed" | "failed" | "held" {
  if (status === "pending_approval") return "pending"
  return status as "scheduled" | "executing" | "completed" | "failed" | "held"
}

export function ExecutionDrawer({ item, onClose }: ExecutionDrawerProps) {
  if (!item) return null

  const isPayment = item.type === "payment"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close drawer"
      />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-[400px] flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isPayment
                  ? "bg-adz-red-dim text-adz-red"
                  : "bg-adz-green-dim text-adz-green"
              )}
            >
              {isPayment ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownLeft className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {item.entityName}
              </p>
              <StatusBadge status={statusToBadge(item.status)} size="sm" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount */}
        <div className="border-b border-border p-5">
          <p
            className={cn(
              "font-mono text-3xl font-bold",
              isPayment ? "text-adz-red" : "text-adz-green"
            )}
          >
            {isPayment ? "-" : "+"}${item.amount.toLocaleString()}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto adz-scrollbar p-5">
          {/* Payment Details */}
          <section className="mb-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Details
            </h4>
            <div className="flex flex-col gap-2">
              <DetailRow label="Reference" value={item.reference} />
              <DetailRow label="Terms" value={item.terms} />
              <DetailRow label="Method" value={item.method} />
              <DetailRow label="Account" value={`****${item.accountLastFour}`} />
            </div>
          </section>

          {/* Timing */}
          <section className="mb-6">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timing
            </h4>
            <div className="flex flex-col gap-2">
              <DetailRow
                label="Scheduled"
                value={`${item.scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${item.scheduledTime}`}
              />
              {item.autoExecuteCountdown && (
                <DetailRow
                  label="Auto-execute in"
                  value={item.autoExecuteCountdown}
                />
              )}
              {item.executedAt && (
                <DetailRow
                  label="Executed"
                  value={item.executedAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}
            </div>
          </section>

          {/* Approval Chain */}
          {item.approvers && item.approvers.length > 0 && (
            <section className="mb-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Approval Chain
              </h4>
              <div className="flex flex-col gap-2">
                {item.approvers.map((approver) => (
                  <div
                    key={approver.userId}
                    className="flex items-center justify-between rounded-lg bg-secondary p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          approver.status === "approved"
                            ? "bg-adz-green-dim text-adz-green"
                            : approver.status === "rejected"
                              ? "bg-adz-red-dim text-adz-red"
                              : "bg-adz-amber-dim text-adz-amber"
                        )}
                      >
                        {approver.status === "approved" ? (
                          <Check className="h-3 w-3" />
                        ) : approver.status === "rejected" ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {approver.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium capitalize",
                        approver.status === "approved"
                          ? "text-adz-green"
                          : approver.status === "rejected"
                            ? "text-adz-red"
                            : "text-adz-amber"
                      )}
                    >
                      {approver.status}
                    </span>
                  </div>
                ))}
              </div>

              {item.status === "pending_approval" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-adz-green px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-adz-green/90"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-adz-red/30 bg-adz-red-dim px-3 py-2 text-xs font-medium text-adz-red transition-colors hover:bg-adz-red/20"
                  >
                    Reject
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Audit Log */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Log
            </h4>
            <div className="relative flex flex-col gap-0 pl-4">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              {item.auditLog.map((entry, idx) => (
                <div key={`${entry.timestamp.getTime()}-${idx}`} className="relative flex gap-3 pb-3">
                  <div className="absolute left-[-13px] top-1.5 h-2 w-2 rounded-full bg-adz-blue ring-2 ring-card" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {entry.action}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.userName} &bull;{" "}
                      {entry.timestamp.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {entry.details && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {entry.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}
