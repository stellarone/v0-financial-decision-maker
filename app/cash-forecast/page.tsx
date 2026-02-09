"use client"

import { useState } from "react"
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
import { InflowsTable } from "@/components/forecast/inflows-table"
import { InsightsPanel } from "@/components/forecast/insights-panel"
import { mockForecastData } from "@/lib/mock-data/forecasts"
import type { Scenario } from "@/lib/types"

const TIME_RANGES = ["7D", "30D", "90D", "12M"] as const

const DEFAULT_SCENARIO: Scenario = {
  paymentDelayDays: 0,
  revenueVariancePercent: 0,
  expenseIncreasePercent: 0,
}

// Compute totals from forecast data
const totalInflows = mockForecastData.reduce((sum, d) => sum + d.inflows, 0)
const totalOutflows = mockForecastData.reduce((sum, d) => sum + d.outflows, 0)
const netCashFlow = totalInflows - totalOutflows
const endingBalance =
  mockForecastData[mockForecastData.length - 1]?.closingBalance || 0
const currentBalance = 847234

// Today is Feb 9, 2026 -> index 8 (0-based for Feb 1 = index 0)
const todayIndex = 8

export default function CashForecastPage() {
  const [timeRange, setTimeRange] = useState<(typeof TIME_RANGES)[number]>("30D")
  const [scenario, setScenario] = useState<Scenario>(DEFAULT_SCENARIO)

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
          value={currentBalance}
          accentColor="blue"
          meta="Across 3 accounts"
        />
        <SummaryCard
          icon={<ArrowDownLeft className="h-4 w-4" />}
          label="Forecasted Inflows"
          value={totalInflows}
          accentColor="green"
          meta="23 expected payments"
        />
        <SummaryCard
          icon={<ArrowUpRight className="h-4 w-4" />}
          label="Scheduled Outflows"
          value={totalOutflows}
          accentColor="red"
          meta="47 payments planned"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Net Cash Flow"
          value={netCashFlow}
          accentColor="purple"
          trend={{ value: 13.5, direction: "up", label: "+13.5% vs. last period" }}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="Ending Balance"
          value={endingBalance}
          accentColor="cyan"
          meta="Above $200K threshold"
        />
      </div>

      {/* Main Chart */}
      <ForecastChart
        data={mockForecastData}
        scenario={scenario}
        todayIndex={todayIndex}
      />

      {/* Scenario Sliders */}
      <ScenarioSliders
        scenario={scenario}
        onChange={setScenario}
        onReset={() => setScenario(DEFAULT_SCENARIO)}
      />

      {/* Bottom 2-col Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InflowsTable />
        <InsightsPanel />
      </div>
    </div>
  )
}
