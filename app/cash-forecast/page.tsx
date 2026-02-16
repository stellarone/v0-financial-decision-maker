"use client"

import { useState, useMemo } from "react"
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Target,
  Download,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import { ForecastChart } from "@/components/forecast/forecast-chart"
import { ScenarioSliders } from "@/components/forecast/scenario-sliders"
import { InsightsPanel } from "@/components/forecast/insights-panel"
import { CashCalendar } from "@/components/calendar/cash-calendar"
import { mockCalendarItems } from "@/lib/mock-data/calendar-items"
import {
  getFilteredForecast,
  getWeeklyBreakdown,
  type TimeRange,
} from "@/lib/mock-data/forecasts"
import type { Scenario } from "@/lib/types"

const TIME_RANGES: TimeRange[] = ["7D", "30D", "90D", "12M"]

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7D": "next 7 days",
  "30D": "next 30 days",
  "90D": "next 90 days",
  "12M": "next 12 months",
}

const DEFAULT_SCENARIO: Scenario = {
  paymentDelayDays: 0,
  revenueVariancePercent: 0,
  expenseIncreasePercent: 0,
}

const CURRENT_BALANCE = 847234

export default function CashForecastPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30D")
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO)

  const { data, todayIndex, labelInterval, dateFormat } = useMemo(
    () => getFilteredForecast(timeRange),
    [timeRange]
  )

  const totalInflows = useMemo(() => data.reduce((sum, d) => sum + d.inflows, 0), [data])
  const totalOutflows = useMemo(() => data.reduce((sum, d) => sum + d.outflows, 0), [data])
  const netCashFlow = totalInflows - totalOutflows
  const endingBalance = data[data.length - 1]?.closingBalance || CURRENT_BALANCE

  const weeklyBreakdown = useMemo(() => getWeeklyBreakdown(data), [data])

  const inflowCount = data.reduce((c, d) => c + d.inflowItems.length, 0)
  const outflowCount = data.reduce((c, d) => c + d.outflowItems.length, 0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cash Flow Forecast"
        subtitle="AI-powered predictions &bull; 91% historical accuracy &bull; Updated 2 min ago"
        actions={
          <div className="flex items-center gap-2">
            {/* Time Range Selector */}
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
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              Edit Assumptions
            </button>
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
            value: Math.round((netCashFlow / totalOutflows) * 100 * 10) / 10 || 0,
            direction: netCashFlow >= 0 ? "up" : "down",
            label: `${netCashFlow >= 0 ? "+" : ""}${(Math.round((netCashFlow / totalOutflows) * 100 * 10) / 10 || 0).toFixed(1)}% vs. outflows`,
          }}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="Ending Balance"
          value={endingBalance}
          accentColor="cyan"
          meta={endingBalance >= 200000 ? "Above $200K threshold" : "Below $200K threshold"}
        />
      </div>

      {/* Cash Calendar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <CashCalendar
          initialItems={mockCalendarItems}
          initialBalance={CURRENT_BALANCE}
        />
      </div>

      {/* Main Chart */}
      <ForecastChart
        data={data}
        scenario={scenario}
        todayIndex={todayIndex}
        labelInterval={labelInterval}
        dateFormat={dateFormat}
      />

      {/* Scenario Sliders */}
      <ScenarioSliders
        scenario={scenario}
        onChange={setScenario}
        onReset={() => setScenario(DEFAULT_SCENARIO)}
      />

      {/* AI Insights */}
      <InsightsPanel weeklyBreakdown={weeklyBreakdown} />
    </div>
  )
}
