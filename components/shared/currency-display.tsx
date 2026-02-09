import { cn } from "@/lib/utils"

interface CurrencyDisplayProps {
  value: number
  showSign?: boolean
  colorCode?: boolean
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
}

export function CurrencyDisplay({
  value,
  showSign = false,
  colorCode = false,
  size = "md",
}: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

  const sign = value >= 0 ? "+" : "-"
  const display = showSign ? `${sign}${formatted}` : value < 0 ? `-${formatted}` : formatted

  return (
    <span
      className={cn(
        "font-mono font-semibold",
        sizeClasses[size],
        colorCode && value > 0 && "text-adz-green",
        colorCode && value < 0 && "text-adz-red",
        colorCode && value === 0 && "text-muted-foreground",
        !colorCode && "text-foreground"
      )}
    >
      {display}
    </span>
  )
}
