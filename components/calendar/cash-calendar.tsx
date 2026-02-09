"use client"

import { useState, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CalendarItem } from "@/lib/types"
import { CalendarDay } from "./calendar-day"
import { CalendarItemCard } from "./calendar-item"

interface CashCalendarProps {
  initialItems: CalendarItem[]
  initialBalance: number
  onItemsChange?: (items: CalendarItem[]) => void
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days: Date[] = []
  const current = new Date(startDate)

  // Always show 6 weeks
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return { days, firstDay, lastDay }
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function CashCalendar({
  initialItems,
  initialBalance,
  onItemsChange,
}: CashCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)) // Feb 2026
  const [items, setItems] = useState<CalendarItem[]>(initialItems)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const { days } = getCalendarDays(year, month)
  const today = new Date(2026, 1, 9) // Feb 9, 2026

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}
    for (const item of items) {
      const key = dateKey(item.date)
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    return map
  }, [items])

  // Calculate projected balances
  const balanceByDate = useMemo(() => {
    const map: Record<string, number> = {}
    let balance = initialBalance

    // Sort all days in order
    const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime())

    for (const day of sortedDays) {
      const key = dateKey(day)
      const dayItems = itemsByDate[key] || []
      for (const item of dayItems) {
        if (item.type === "inflow") balance += item.amount
        else balance -= item.amount
      }
      map[key] = balance
    }
    return map
  }, [days, itemsByDate, initialBalance])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const draggedItemId = active.id as string
      const dropId = over.id as string

      if (!dropId.startsWith("day-")) return

      const targetDateStr = dropId.replace("day-", "")
      const targetDate = new Date(targetDateStr + "T00:00:00")

      setItems((prev) => {
        const updated = prev.map((item) => {
          if (item.id === draggedItemId) {
            return { ...item, date: targetDate }
          }
          return item
        })
        onItemsChange?.(updated)
        return updated
      })

      setToastMessage("Cash Forecast Updated")
      setTimeout(() => setToastMessage(null), 3000)
    },
    [onItemsChange]
  )

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const monthName = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-accent"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">{monthName}</h2>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground transition-colors hover:bg-accent"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-adz-green" />
              <span className="text-xs text-muted-foreground">Expected Inflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-adz-red" />
              <span className="text-xs text-muted-foreground">Due Payment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-adz-amber" />
              <span className="text-xs text-muted-foreground">
                Scheduled (Movable)
              </span>
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = dateKey(day)
            const isToday =
              day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear()
            const isOtherMonth = day.getMonth() !== month

            return (
              <CalendarDay
                key={key}
                date={day}
                isToday={isToday}
                isOtherMonth={isOtherMonth}
                projectedBalance={balanceByDate[key] || initialBalance}
                items={itemsByDate[key] || []}
              />
            )
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? <CalendarItemCard item={activeItem} /> : null}
      </DragOverlay>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-adz-blue/30 bg-adz-blue-dim px-4 py-3 text-sm font-medium text-adz-blue shadow-lg animate-in fade-in slide-in-from-bottom-4">
          {toastMessage}
        </div>
      )}
    </DndContext>
  )
}
