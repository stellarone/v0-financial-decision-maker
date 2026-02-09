"use client"

import { cn } from "@/lib/utils"
import { useDroppable } from "@dnd-kit/core"
import type { CalendarItem } from "@/lib/types"
import { CalendarItemCard } from "./calendar-item"

interface CalendarDayProps {
  date: Date
  isToday: boolean
  isOtherMonth: boolean
  projectedBalance: number
  items: CalendarItem[]
}

export function CalendarDay({
  date,
  isToday,
  isOtherMonth,
  projectedBalance,
  items,
}: CalendarDayProps) {
  const dateStr = date.toISOString().split("T")[0]
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateStr}`,
    data: { date },
  })

  const dayNum = date.getDate()

  const formattedBalance =
    Math.abs(projectedBalance) >= 1_000_000
      ? `$${(projectedBalance / 1_000_000).toFixed(1)}M`
      : `$${(projectedBalance / 1000).toFixed(0)}K`

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[110px] flex-col rounded-lg border border-border p-1.5 transition-colors",
        isToday && "bg-adz-blue-dim/40 border-adz-blue/30",
        isOtherMonth && "opacity-40 bg-secondary/30",
        !isToday && !isOtherMonth && "bg-card",
        isOver && "bg-adz-blue-dim border-adz-blue border-dashed"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            isToday && "bg-adz-blue text-primary-foreground",
            !isToday && "text-muted-foreground"
          )}
        >
          {dayNum}
        </span>
        {!isOtherMonth && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {formattedBalance}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        {items.slice(0, 3).map((item) => (
          <CalendarItemCard key={item.id} item={item} />
        ))}
        {items.length > 3 && (
          <span className="text-[10px] text-muted-foreground text-center">
            +{items.length - 3} more
          </span>
        )}
      </div>
    </div>
  )
}
