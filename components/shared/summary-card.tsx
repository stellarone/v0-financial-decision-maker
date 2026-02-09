import React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

const accentMap = {
  blue: {
    border: "border-l-adz-blue",
    iconBg: "bg-adz-blue-dim",
    iconText: "text-adz-blue",
    trendUp: "text-adz-green",
    trendDown: "text-adz-red",
  },
  green: {
    border: "border-l-adz-green",
    iconBg: "bg-adz-green-dim",
    iconText: "text-adz-green",
    trendUp: "text-adz-green",
    trendDown: "text-adz-red",
  },
  red: {
    border: "border-l-adz-red",
    iconBg: "bg-adz-red-dim",
    iconText: "text-adz-red",
    trendUp: "text-adz-red",
    trendDown: "text-adz-green",
  },
  purple: {
    border: "border-l-adz-purple",
    iconBg: "bg-adz-purple-dim",
    iconText: "text-adz-purple",
    trendUp: "text-adz-green",
    trendDown: "text-adz-red",
  },
  cyan: {
    border: "border-l-adz-cyan",
    iconBg: "bg-adz-cyan-dim",
    iconText: "text-adz-cyan",
    trendUp: "text-adz-green",
    trendDown: "text-adz-red",
  },
  amber: {
    border: "border-l-adz-amber",
    iconBg: "bg-adz-amber-dim",
    iconText: "text-adz-amber",
    trendUp: "text-adz-green",
    trendDown: "text-adz-red",
  },
}

interface SummaryCardProps {
  icon: React.ReactNode
  label: string
  value: number
  format?: "currency" | "number" | "percent"
  accentColor: keyof typeof accentMap
  trend?: {
    value: number
    direction: "up" | "down"
    label: string
  }
  meta?: string
}

function formatValue(value: number, format: string) {
  if (format === "currency") {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`
  }
  return value.toLocaleString()
}

export function SummaryCard({
  icon,
  label,
  value,
  format = "currency",
  accentColor,
  trend,
  meta,
}: SummaryCardProps) {
  const colors = accentMap[accentColor]

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-l-[3px] border-border bg-card p-4 transition-transform hover:-translate-y-0.5",
        colors.border
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            colors.iconBg
          )}
        >
          <span className={colors.iconText}>{icon}</span>
        </div>
      </div>
      <p className="font-mono text-2xl font-bold text-foreground">
        {formatValue(value, format)}
      </p>
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.direction === "up" ? colors.trendUp : colors.trendDown
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.label}
          </span>
        )}
        {meta && (
          <span className="text-xs text-muted-foreground">{meta}</span>
        )}
      </div>
    </div>
  )
}
