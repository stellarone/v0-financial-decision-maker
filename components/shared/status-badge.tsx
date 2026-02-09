import React from "react"
import { cn } from "@/lib/utils"
import { Check, X, Pause } from "lucide-react"

type Status =
  | "active"
  | "paused"
  | "pending"
  | "completed"
  | "failed"
  | "scheduled"
  | "executing"
  | "held"

const statusConfig: Record<
  Status,
  { label: string; dotClass: string; bgClass: string; textClass: string; icon?: React.ComponentType<{ className?: string }> }
> = {
  active: {
    label: "Active",
    dotClass: "bg-adz-green adz-pulse",
    bgClass: "bg-adz-green-dim border-adz-green/30",
    textClass: "text-adz-green",
  },
  executing: {
    label: "Executing",
    dotClass: "bg-adz-green adz-pulse",
    bgClass: "bg-adz-green-dim border-adz-green/30",
    textClass: "text-adz-green",
  },
  scheduled: {
    label: "Scheduled",
    dotClass: "bg-adz-blue",
    bgClass: "bg-adz-blue-dim border-adz-blue/30",
    textClass: "text-adz-blue",
  },
  pending: {
    label: "Pending Approval",
    dotClass: "bg-adz-amber",
    bgClass: "bg-adz-amber-dim border-adz-amber/30",
    textClass: "text-adz-amber",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-adz-green",
    bgClass: "bg-adz-green-dim border-adz-green/30",
    textClass: "text-adz-green",
    icon: Check,
  },
  failed: {
    label: "Failed",
    dotClass: "bg-adz-red",
    bgClass: "bg-adz-red-dim border-adz-red/30",
    textClass: "text-adz-red",
    icon: X,
  },
  paused: {
    label: "Paused",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-secondary border-border",
    textClass: "text-muted-foreground",
    icon: Pause,
  },
  held: {
    label: "Held",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-secondary border-border",
    textClass: "text-muted-foreground",
    icon: Pause,
  },
}

interface StatusBadgeProps {
  status: Status
  pulse?: boolean
  size?: "sm" | "md"
}

export function StatusBadge({
  status,
  size = "sm",
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.bgClass,
        config.textClass,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
    >
      {Icon ? (
        <Icon className="h-3 w-3" />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      )}
      {config.label}
    </span>
  )
}
