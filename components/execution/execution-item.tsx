"use client"

import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Play,
  Pause,
  Check,
  X,
  RotateCcw,
  Calendar,
  Eye,
  Info,
} from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { ExecutionItem } from "@/lib/types"

interface ExecutionItemProps {
  item: ExecutionItem
  onSelect: (item: ExecutionItem) => void
}

function statusToBadge(
  status: string
): "scheduled" | "pending" | "executing" | "completed" | "failed" | "held" {
  if (status === "pending_approval") return "pending"
  return status as "scheduled" | "executing" | "completed" | "failed" | "held"
}

function getActions(status: string) {
  switch (status) {
    case "scheduled":
      return [
        { label: "Reschedule", icon: Calendar, variant: "secondary" as const },
        { label: "Hold", icon: Pause, variant: "secondary" as const },
        { label: "Execute Now", icon: Play, variant: "primary" as const },
      ]
    case "pending_approval":
      return [
        { label: "Approve", icon: Check, variant: "primary" as const },
        { label: "Reject", icon: X, variant: "danger" as const },
        { label: "Request Info", icon: Info, variant: "secondary" as const },
      ]
    case "executing":
      return [
        { label: "Cancel", icon: X, variant: "danger" as const },
      ]
    case "completed":
      return [
        { label: "View Details", icon: Eye, variant: "secondary" as const },
      ]
    case "failed":
      return [
        { label: "Retry", icon: RotateCcw, variant: "primary" as const },
        { label: "Mark Resolved", icon: Check, variant: "secondary" as const },
      ]
    case "held":
      return [
        { label: "Resume", icon: Play, variant: "primary" as const },
        { label: "Cancel", icon: X, variant: "danger" as const },
      ]
    default:
      return []
  }
}

const actionStyles = {
  primary:
    "border-adz-blue/30 bg-adz-blue-dim text-adz-blue hover:bg-adz-blue/20",
  secondary:
    "border-border bg-secondary text-foreground hover:bg-accent",
  danger:
    "border-adz-red/30 bg-adz-red-dim text-adz-red hover:bg-adz-red/20",
}

export function ExecutionItemRow({ item, onSelect }: ExecutionItemProps) {
  const isPayment = item.type === "payment"
  const actions = getActions(item.status)

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-colors hover:bg-adz-elevated cursor-pointer",
        item.status === "pending_approval" && "border-l-2 border-l-adz-amber"
      )}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(item)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isPayment
              ? "bg-adz-red-dim text-adz-red"
              : "bg-adz-green-dim text-adz-green"
          )}
        >
          {isPayment ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownLeft className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {item.entityName}
              </p>
              <StatusBadge status={statusToBadge(item.status)} />
            </div>
            <p
              className={cn(
                "font-mono text-base font-bold",
                isPayment ? "text-adz-red" : "text-adz-green"
              )}
            >
              {isPayment ? "-" : "+"}$
              {item.amount.toLocaleString()}
            </p>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            {item.reference} &bull; {item.terms}
          </p>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-secondary p-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.status === "executing"
                    ? "bg-adz-green adz-pulse"
                    : item.status === "scheduled"
                      ? "bg-adz-blue"
                      : item.status === "pending_approval"
                        ? "bg-adz-amber"
                        : item.status === "completed"
                          ? "bg-adz-green"
                          : "bg-muted-foreground"
                )}
              />
              {item.status === "completed"
                ? `Completed ${item.executedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : `${item.status === "executing" ? "Executing" : "Scheduled"}: ${item.scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${item.scheduledTime}`}
            </span>
            <span>Method: {item.method} &bull; ****{item.accountLastFour}</span>
            {item.autoExecuteCountdown && (
              <span>Auto-execute in: {item.autoExecuteCountdown}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="mt-3 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    actionStyles[action.variant]
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
