import { cn } from "@/lib/utils"
import { mockInsights } from "@/lib/mock-data/insights"
import { Lightbulb, AlertTriangle, ShieldAlert, Box } from "lucide-react"

const iconMap = {
  opportunity: Lightbulb,
  warning: AlertTriangle,
  risk: ShieldAlert,
}

const borderMap = {
  opportunity: "border-l-adz-green",
  warning: "border-l-adz-amber",
  risk: "border-l-adz-red",
}

const iconColorMap = {
  opportunity: "text-adz-green",
  warning: "text-adz-amber",
  risk: "text-adz-red",
}

interface WeeklyRow {
  week: string
  inflows: number
  outflows: number
  net: number
}

interface InsightsPanelProps {
  weeklyBreakdown: WeeklyRow[]
}

export function InsightsPanel({ weeklyBreakdown }: InsightsPanelProps) {
  const displayWeeks = weeklyBreakdown.slice(0, 8)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Box className="h-4 w-4 text-adz-blue" />
        <h3 className="text-sm font-semibold text-foreground">
          AI Insights & Analysis
        </h3>
      </div>

      {/* Insight Cards */}
      <div className="flex flex-col gap-2 mb-6">
        {mockInsights.slice(0, 4).map((insight) => {
          const Icon = iconMap[insight.type]
          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-lg border-l-2 bg-secondary p-3",
                borderMap[insight.type]
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    iconColorMap[insight.type]
                  )}
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Weekly Breakdown */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Period Breakdown ({displayWeeks.length} weeks)
        </h4>
        <div className="flex flex-col gap-3">
          {displayWeeks.map((week) => {
            const total = week.inflows + week.outflows || 1
            const inflowPct = (week.inflows / total) * 100
            return (
              <div key={week.week}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {week.week}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      week.net >= 0 ? "text-adz-green" : "text-adz-red"
                    )}
                  >
                    Net: {week.net >= 0 ? "+" : ""}$
                    {(week.net / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                  <span>+${(week.inflows / 1000).toFixed(1)}K</span>
                  <span>-${(week.outflows / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-adz-green"
                    style={{ width: `${inflowPct}%` }}
                  />
                  <div
                    className="bg-adz-red"
                    style={{ width: `${100 - inflowPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
