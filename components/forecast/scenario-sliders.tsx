"use client"

import { Sliders, RotateCcw } from "lucide-react"
import type { Scenario } from "@/lib/types"

interface ScenarioSlidersProps {
  scenario: Scenario
  onChange: (scenario: Scenario) => void
  onReset: () => void
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold text-adz-purple">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-adz-purple [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-adz-purple"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export function ScenarioSliders({
  scenario,
  onChange,
  onReset,
}: ScenarioSlidersProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-adz-purple" />
          <h3 className="text-sm font-semibold text-foreground">
            What-If Scenario Modeling
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          <button
            type="button"
            className="rounded-lg bg-adz-purple px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-adz-purple/90"
          >
            Apply to Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SliderField
          label="Customer Payment Delay"
          value={scenario.paymentDelayDays}
          min={0}
          max={14}
          step={1}
          format={(v) => `+${v} days`}
          onChange={(v) => onChange({ ...scenario, paymentDelayDays: v })}
        />
        <SliderField
          label="Revenue Variance"
          value={scenario.revenueVariancePercent}
          min={-30}
          max={30}
          step={1}
          format={(v) => `${v >= 0 ? "+" : ""}${v}%`}
          onChange={(v) =>
            onChange({ ...scenario, revenueVariancePercent: v })
          }
        />
        <SliderField
          label="Expense Increase"
          value={scenario.expenseIncreasePercent}
          min={0}
          max={30}
          step={1}
          format={(v) => `+${v}%`}
          onChange={(v) =>
            onChange({ ...scenario, expenseIncreasePercent: v })
          }
        />
      </div>
    </div>
  )
}
