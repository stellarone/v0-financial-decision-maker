"use client"

import { useState } from "react"
import { ArrowUpRight, ArrowDownLeft, AlertTriangle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { mockForecastData } from "@/lib/mock-data/forecasts"
import {
  LineChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts"

const miniChartData = mockForecastData.map((d) => ({
  date: d.date.getDate(),
  balance: d.closingBalance,
}))

const nextExecutions = [
  {
    id: "ne-1",
    type: "payment" as const,
    name: "Raw Materials Co",
    time: "Tomorrow at 6:00 AM",
    method: "ACH",
    amount: -18200,
  },
  {
    id: "ne-2",
    type: "payment" as const,
    name: "Logistics Plus",
    time: "Feb 10 at 6:00 AM",
    method: "ACH",
    amount: -12600,
  },
  {
    id: "ne-3",
    type: "collection" as const,
    name: "Metro Retail Group",
    time: "Feb 12 at 2:00 PM",
    method: "ACH",
    amount: 67800,
    confidence: 94,
  },
  {
    id: "ne-4",
    type: "payment" as const,
    name: "Equipment Supplier",
    time: "Feb 15 at 6:00 AM",
    method: "Wire",
    amount: -45000,
  },
  {
    id: "ne-5",
    type: "collection" as const,
    name: "Summit Enterprises",
    time: "Feb 12 at 3:00 PM",
    method: "ACH",
    amount: 31200,
    confidence: 82,
  },
]

const alerts = [
  {
    id: "a-1",
    type: "warning" as const,
    title: "Payment Optimization",
    description:
      "Move Equipment Supplier payment to Feb 10 for 2% early discount ($900 savings).",
  },
  {
    id: "a-2",
    type: "risk" as const,
    title: "Collection Risk",
    description:
      "Pacific Trading trending late. $19.4K may be delayed 5-7 days.",
  },
]

export function CalendarSidebar() {
  const [autoPayEnabled, setAutoPayEnabled] = useState(true)

  return (
    <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-border bg-card adz-scrollbar xl:flex xl:flex-col">
      <div className="flex flex-col gap-5 p-4">
        {/* Section 1: Autonomous Execution */}
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-adz-blue" />
            <h3 className="text-sm font-semibold text-foreground">
              Autonomous Execution
            </h3>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-secondary p-3 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  autoPayEnabled ? "bg-adz-green adz-pulse" : "bg-muted-foreground"
                )}
              />
              <span className="text-xs font-medium text-foreground">
                {autoPayEnabled ? "Auto-pay enabled" : "Auto-pay disabled"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoPayEnabled(!autoPayEnabled)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                autoPayEnabled ? "bg-adz-blue" : "bg-muted"
              )}
              role="switch"
              aria-checked={autoPayEnabled}
              aria-label="Toggle auto-pay"
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform",
                  autoPayEnabled ? "left-[18px]" : "left-0.5"
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="font-mono text-xl font-bold text-foreground">47</p>
              <p className="text-[10px] text-muted-foreground">Queued</p>
            </div>
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="font-mono text-xl font-bold text-foreground">
                $298K
              </p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {/* Section 2: 30-Day Forecast Mini Chart */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            30-Day Forecast
          </h3>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={miniChartData}>
                <YAxis
                  domain={["dataMin - 50000", "dataMax + 50000"]}
                  hide
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="oklch(0.62 0.18 250)"
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceLine
                  y={200000}
                  stroke="oklch(0.75 0.15 75)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="h-px w-4 border-t-2 border-dashed border-adz-amber" />
            <span className="text-[10px] text-muted-foreground">
              $200K min threshold
            </span>
          </div>
        </div>

        {/* Section 3: Next Auto-Executions */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Next Auto-Executions
          </h3>
          <div className="flex flex-col gap-2">
            {nextExecutions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-start gap-2 rounded-lg bg-secondary p-2.5"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded",
                    exec.type === "payment"
                      ? "bg-adz-red-dim text-adz-red"
                      : "bg-adz-green-dim text-adz-green"
                  )}
                >
                  {exec.type === "payment" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownLeft className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {exec.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {exec.time} &bull; {exec.method}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "font-mono text-xs font-semibold",
                      exec.amount < 0 ? "text-adz-red" : "text-adz-green"
                    )}
                  >
                    {exec.amount < 0 ? "-" : "+"}$
                    {(Math.abs(exec.amount) / 1000).toFixed(1)}K
                  </p>
                  {"confidence" in exec && exec.confidence && (
                    <p className="text-[10px] text-muted-foreground">
                      {exec.confidence}% conf
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Alerts */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Alerts Requiring Attention
          </h3>
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border-l-2 bg-secondary p-3",
                  alert.type === "warning"
                    ? "border-l-adz-amber"
                    : "border-l-adz-red"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle
                    className={cn(
                      "h-3 w-3",
                      alert.type === "warning"
                        ? "text-adz-amber"
                        : "text-adz-red"
                    )}
                  />
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      alert.type === "warning"
                        ? "text-adz-amber"
                        : "text-adz-red"
                    )}
                  >
                    {alert.title}
                  </p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {alert.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
