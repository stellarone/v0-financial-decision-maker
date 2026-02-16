"use client"

import { useMemo, useState } from "react"
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import {
  getFilteredForecast,
  type TimeRange,
} from "@/lib/mock-data/forecasts"

const TIME_RANGES: TimeRange[] = ["7D", "30D", "90D", "12M"]

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7D": "next 7 days",
  "30D": "next 30 days",
  "90D": "next 90 days",
  "12M": "next 12 months",
}

const CURRENT_BALANCE = 847234

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30D")

  const { data } = useMemo(
    () => getFilteredForecast(timeRange),
    [timeRange],
  )

  const totalInflows = useMemo(
    () => data.reduce((sum, d) => sum + d.inflows, 0),
    [data],
  )
  const totalOutflows = useMemo(
    () => data.reduce((sum, d) => sum + d.outflows, 0),
    [data],
  )
  const netCashFlow = totalInflows - totalOutflows
  const endingBalance = data[data.length - 1]?.closingBalance || CURRENT_BALANCE

  const inflowCount = data.reduce((c, d) => c + d.inflowItems.length, 0)
  const outflowCount = data.reduce((c, d) => c + d.outflowItems.length, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dashboard"
        subtitle="Financial overview &bull; Real-time account summary"
        actions={
          <div className="flex rounded-lg border border-border bg-secondary p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  timeRange === range
                    ? "bg-adz-blue text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={<Landmark className="h-4 w-4" />}
          label="Current Balance"
          value={CURRENT_BALANCE}
          accentColor="blue"
          meta="Across 3 accounts"
        />
        <SummaryCard
          icon={<ArrowDownLeft className="h-4 w-4" />}
          label="Forecasted Inflows"
          value={totalInflows}
          accentColor="green"
          meta={`${inflowCount} expected payments (${TIME_RANGE_LABELS[timeRange]})`}
        />
        <SummaryCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Scheduled Outflows"
          value={totalOutflows}
          accentColor="red"
          meta={`${outflowCount} payments planned (${TIME_RANGE_LABELS[timeRange]})`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Net Cash Flow"
          value={netCashFlow}
          accentColor="purple"
          trend={{
            value:
              Math.round((netCashFlow / totalOutflows) * 100 * 10) / 10 || 0,
            direction: netCashFlow >= 0 ? "up" : "down",
            label: `${netCashFlow >= 0 ? "+" : ""}${(Math.round((netCashFlow / totalOutflows) * 100 * 10) / 10 || 0).toFixed(1)}% vs. outflows`,
          }}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="Ending Balance"
          value={endingBalance}
          accentColor="cyan"
          meta={
            endingBalance >= 200000
              ? "Above $200K threshold"
              : "Below $200K threshold"
          }
        />
      </div>
    </div>
  )
}
