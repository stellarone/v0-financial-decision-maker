import { cn } from "@/lib/utils"

interface ConfidenceBarProps {
  value: number
  showLabel?: boolean
  size?: "sm" | "md"
}

export function ConfidenceBar({
  value,
  showLabel = true,
  size = "md",
}: ConfidenceBarProps) {
  const fillColor =
    value >= 80
      ? "bg-adz-green"
      : value >= 60
        ? "bg-adz-amber"
        : "bg-adz-red"

  const textColor =
    value >= 80
      ? "text-adz-green"
      : value >= 60
        ? "text-adz-amber"
        : "text-adz-red"

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-secondary",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", fillColor)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-mono text-xs font-medium",
            textColor
          )}
        >
          {value}%
        </span>
      )}
    </div>
  )
}
