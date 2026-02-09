"use client"

import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { CashForecast, Scenario } from "@/lib/types"

interface ForecastChartProps {
  data: CashForecast[]
  scenario: Scenario
  todayIndex: number
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

function applyScenario(data: CashForecast[], scenario: Scenario) {
  let scenarioBalance = data[0]?.openingBalance || 847234

  return data.map((d) => {
    const delayedInflows =
      scenario.paymentDelayDays > 0
        ? d.inflows * (1 - scenario.paymentDelayDays * 0.05)
        : d.inflows
    const adjustedInflows =
      delayedInflows * (1 + scenario.revenueVariancePercent / 100)
    const adjustedOutflows =
      d.outflows * (1 + scenario.expenseIncreasePercent / 100)

    scenarioBalance = scenarioBalance + adjustedInflows - adjustedOutflows
    return scenarioBalance
  })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-mono text-xs font-medium text-foreground">
            {entry.name === "Inflows"
              ? `+${formatCurrency(entry.value)}`
              : entry.name === "Outflows"
                ? `-${formatCurrency(entry.value)}`
                : formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ForecastChart({
  data,
  scenario,
  todayIndex,
}: ForecastChartProps) {
  const hasScenario =
    scenario.paymentDelayDays !== 0 ||
    scenario.revenueVariancePercent !== 0 ||
    scenario.expenseIncreasePercent !== 0

  const scenarioBalances = hasScenario ? applyScenario(data, scenario) : []

  const chartData = data.map((d, i) => ({
    date: `Feb ${d.date.getDate()}`,
    balance: d.closingBalance,
    inflows: d.inflows || undefined,
    outflows: d.outflows || undefined,
    scenario: hasScenario ? scenarioBalances[i] : undefined,
  }))

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Cash Flow Projection
        </h3>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.005 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
              tickLine={false}
              axisLine={{ stroke: "oklch(0.25 0.005 260)" }}
              interval={4}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: "oklch(0.65 0 0)" }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />

            {/* Threshold line */}
            <ReferenceLine
              y={200000}
              stroke="oklch(0.75 0.15 75)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: "$200K min",
                position: "right",
                fill: "oklch(0.75 0.15 75)",
                fontSize: 10,
              }}
            />

            {/* Today marker */}
            <ReferenceLine
              x={chartData[todayIndex]?.date}
              stroke="oklch(0.5 0 0)"
              strokeDasharray="4 4"
              label={{
                value: "Today",
                position: "bottom",
                fill: "oklch(0.65 0 0)",
                fontSize: 10,
              }}
            />

            {/* Inflow bars */}
            <Bar
              dataKey="inflows"
              name="Inflows"
              fill="oklch(0.7 0.18 155)"
              opacity={0.6}
              barSize={6}
              radius={[2, 2, 0, 0]}
            />

            {/* Outflow bars */}
            <Bar
              dataKey="outflows"
              name="Outflows"
              fill="oklch(0.62 0.2 25)"
              opacity={0.6}
              barSize={6}
              radius={[2, 2, 0, 0]}
            />

            {/* Balance line with gradient */}
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.62 0.18 250)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.62 0.18 250)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="balance"
              name="Cash Balance"
              stroke="oklch(0.62 0.18 250)"
              strokeWidth={2.5}
              fill="url(#balanceGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "oklch(0.62 0.18 250)",
                stroke: "oklch(0.16 0.005 260)",
                strokeWidth: 2,
              }}
            />

            {/* Scenario line */}
            {hasScenario && (
              <Line
                type="monotone"
                dataKey="scenario"
                name="What-If Scenario"
                stroke="oklch(0.62 0.2 300)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                opacity={0.7}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
