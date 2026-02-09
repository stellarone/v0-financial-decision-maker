"use client"

import { cn } from "@/lib/utils"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { CalendarItem as CalendarItemType } from "@/lib/types"

interface CalendarItemProps {
  item: CalendarItemType
}

export function CalendarItemCard({ item }: CalendarItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: !item.isDraggable,
      data: { item },
    })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined

  const isInflow = item.type === "inflow"
  const isScheduled = item.category === "scheduled"
  const isDue = item.category === "due"

  const borderColor = isInflow
    ? "border-l-adz-green"
    : isScheduled
      ? "border-l-adz-amber"
      : "border-l-adz-red"

  const bgColor = isInflow
    ? "bg-adz-green-dim/50"
    : isScheduled
      ? "bg-adz-amber-dim/50"
      : "bg-adz-red-dim/50"

  const amountColor = isInflow ? "text-adz-green" : "text-adz-red"

  const formattedAmount =
    Math.abs(item.amount) >= 1000
      ? `${isInflow ? "+" : "-"}$${(Math.abs(item.amount) / 1000).toFixed(0)}K`
      : `${isInflow ? "+" : "-"}$${Math.abs(item.amount).toLocaleString()}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(item.isDraggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "flex items-center justify-between rounded border-l-2 px-1.5 py-1 text-[10px] transition-opacity",
        borderColor,
        bgColor,
        isDragging && "opacity-60 scale-[1.02]",
        item.isDraggable && "cursor-grab active:cursor-grabbing",
        !item.isDraggable && isDue && "cursor-default"
      )}
    >
      <span className="truncate text-foreground/80 max-w-[60%]">
        {item.entityName}
      </span>
      <span className={cn("font-mono font-semibold whitespace-nowrap", amountColor)}>
        {formattedAmount}
      </span>
    </div>
  )
}
