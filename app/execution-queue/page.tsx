"use client"

import { useState, useMemo } from "react"
import { Pause, Play, AlertTriangle, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import { ExecutionItemRow } from "@/components/execution/execution-item"
import { ExecutionDrawer } from "@/components/execution/execution-drawer"
import { mockExecutionItems } from "@/lib/mock-data/execution-queue"
import type { ExecutionItem, ExecutionStatus } from "@/lib/types"

const FILTER_TABS: { label: string; value: ExecutionStatus | "all"; count: number }[] = [
  { label: "All", value: "all", count: 0 },
  { label: "Scheduled", value: "scheduled", count: 0 },
  { label: "Pending Approval", value: "pending_approval", count: 0 },
  { label: "Executing", value: "executing", count: 0 },
  { label: "Completed", value: "completed", count: 0 },
  { label: "Failed", value: "failed", count: 0 },
]

export default function ExecutionQueuePage() {
  const [activeFilter, setActiveFilter] = useState<ExecutionStatus | "all">("all")
  const [selectedItem, setSelectedItem] = useState<ExecutionItem | null>(null)
  const [autonomousMode, setAutonomousMode] = useState(true)

  // Compute counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: mockExecutionItems.length }
    for (const item of mockExecutionItems) {
      c[item.status] = (c[item.status] || 0) + 1
    }
    return c
  }, [])

  // Filtered items
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return mockExecutionItems
    return mockExecutionItems.filter((item) => item.status === activeFilter)
  }, [activeFilter])

  // Pending approval items
  const pendingItems = mockExecutionItems.filter(
    (item) => item.status === "pending_approval"
  )

  // Metrics
  const queuedCount = counts.scheduled || 0
  const todayCount = (counts.executing || 0) + (counts.completed || 0)
  const pendingCount = counts.pending_approval || 0
  const failedCount = counts.failed || 0
  const totalAmount = mockExecutionItems
    .filter((i) => i.status === "scheduled" || i.status === "executing" || i.status === "pending_approval")
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Execution Queue"
        subtitle={`${mockExecutionItems.length} payments scheduled &bull; ${todayCount} executing today &bull; $${(totalAmount / 1000).toFixed(0)}K total`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-adz-red/30 bg-adz-red-dim px-3 py-2 text-sm font-medium text-adz-red transition-colors hover:bg-adz-red/20"
            >
              <Pause className="h-4 w-4" />
              Pause All
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-adz-blue px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-adz-blue/90"
            >
              <Play className="h-4 w-4" />
              Execute Next
            </button>
          </div>
        }
      />

      {/* Status Banner */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  autonomousMode ? "bg-adz-green adz-pulse" : "bg-muted-foreground"
                )}
              />
              <span className="text-sm font-semibold text-foreground">
                {autonomousMode ? "AUTONOMOUS MODE ACTIVE" : "AUTONOMOUS MODE PAUSED"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <MetricBox label="Queued" value={queuedCount + pendingCount + (counts.executing || 0)} />
              <MetricBox label="Today" value={todayCount} />
              <MetricBox label="Pending" value={pendingCount} highlight="amber" />
              <MetricBox label="Failed" value={failedCount} highlight={failedCount > 0 ? "red" : undefined} />
              <MetricBox
                label="Total"
                value={`$${(totalAmount / 1000).toFixed(0)}K`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutonomousMode(!autonomousMode)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              autonomousMode ? "bg-adz-green" : "bg-muted"
            )}
            role="switch"
            aria-checked={autonomousMode}
            aria-label="Toggle autonomous mode"
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform",
                autonomousMode ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingItems.length > 0 && (
        <div className="rounded-lg border border-adz-amber/30 bg-adz-amber-dim/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-adz-amber" />
            <span className="text-sm font-semibold text-adz-amber">
              {pendingItems.length} PAYMENTS REQUIRE YOUR APPROVAL
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These exceed auto-approval thresholds or have policy flags
          </p>
          <div className="flex flex-col gap-2">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.entityName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reason:{" "}
                    {item.amount >= 25000
                      ? `Exceeds $25K auto-limit`
                      : "First payment to new vendor"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-adz-red">
                    -${item.amount.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg bg-adz-green px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-adz-green/90"
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg border border-adz-red/30 bg-adz-red-dim px-2.5 py-1.5 text-xs font-medium text-adz-red transition-colors hover:bg-adz-red/20"
                  >
                    <X className="h-3 w-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === tab.value
                ? "bg-adz-blue text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                activeFilter === tab.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {counts[tab.value] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Execution Timeline */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {"Today's"} Execution Timeline
        </h3>
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
          {[
            { time: "6:00 AM", name: "Packaging Materials Inc", amount: -9800, status: "completed" },
            { time: "9:00 AM", name: "Raw Materials Co", amount: -18200, status: "executing" },
            { time: "9:00 AM", name: "Kiln Services", amount: -8400, status: "executing" },
            { time: "12:00 PM", name: "Logistics Plus", amount: -12600, status: "scheduled" },
            { time: "3:00 PM", name: "Insurance Premium", amount: -4200, status: "scheduled" },
          ].map((entry, idx) => (
            <div key={idx} className="relative flex items-center gap-3 pb-3">
              <div
                className={cn(
                  "absolute left-[-17px] h-3 w-3 rounded-full ring-2 ring-card",
                  entry.status === "completed"
                    ? "bg-adz-green"
                    : entry.status === "executing"
                      ? "bg-adz-green adz-pulse"
                      : "bg-border"
                )}
              />
              <span className="w-16 text-xs text-muted-foreground font-mono">
                {entry.time}
              </span>
              <span className="text-xs text-foreground">{entry.name}</span>
              <span className="font-mono text-xs font-semibold text-adz-red ml-auto">
                -${Math.abs(entry.amount).toLocaleString()}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium capitalize",
                  entry.status === "completed"
                    ? "text-adz-green"
                    : entry.status === "executing"
                      ? "text-adz-blue"
                      : "text-muted-foreground"
                )}
              >
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Execution List */}
      <div className="flex flex-col gap-2">
        {filteredItems.map((item) => (
          <ExecutionItemRow
            key={item.id}
            item={item}
            onSelect={setSelectedItem}
          />
        ))}
        {filteredItems.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
            <p className="text-sm text-muted-foreground">
              No items matching this filter.
            </p>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <ExecutionDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}

function MetricBox({
  label,
  value,
  highlight,
}: {
  label: string
  value: number | string
  highlight?: "amber" | "red"
}) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2 text-center min-w-[60px]">
      <p
        className={cn(
          "font-mono text-lg font-bold",
          highlight === "amber"
            ? "text-adz-amber"
            : highlight === "red"
              ? "text-adz-red"
              : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
