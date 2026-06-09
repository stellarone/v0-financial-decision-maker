"use client"

import { useMemo, useState } from "react"
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  Save,
  Play,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { SummaryCard } from "@/components/shared/summary-card"
import { CashCalendar } from "@/components/calendar/cash-calendar"
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar"
import { SavePlanModal } from "@/components/calendar/save-plan-modal"
import { mockCalendarItems } from "@/lib/mock-data/calendar-items"
import type { CalendarItem } from "@/lib/types"

const INITIAL_BALANCE = 847234

export interface AcumaticaCalendarInflow {
  id: string
  dateISO: string
  entityName: string
  entityId: string
  reference: string
  amount: number
}

export interface AcumaticaCalendarOutflow {
  id: string
  dateISO: string
  entityName: string
  entityId: string
  reference: string
  amount: number
}

interface CashCalendarPageClientProps {
  acumaticaInflows: AcumaticaCalendarInflow[]
  acumaticaOutflows: AcumaticaCalendarOutflow[]
  currentCashPosition: number | null
}

function toCalendarInflowItem(inflow: AcumaticaCalendarInflow): CalendarItem {
  const parsedDate = new Date(`${inflow.dateISO}T00:00:00`)
  const date = Number.isNaN(parsedDate.getTime()) ? new Date(2026, 1, 1) : parsedDate

  return {
    id: inflow.id,
    date,
    type: "inflow",
    category: "expected",
    entityName: inflow.entityName,
    entityId: inflow.entityId,
    reference: inflow.reference,
    amount: inflow.amount,
    isDraggable: false,
  }
}

function toCalendarOutflowItem(outflow: AcumaticaCalendarOutflow): CalendarItem {
  const parsedDate = new Date(`${outflow.dateISO}T00:00:00`)
  const date = Number.isNaN(parsedDate.getTime()) ? new Date(2026, 1, 1) : parsedDate

  return {
    id: outflow.id,
    date,
    type: "outflow",
    category: "due",
    entityName: outflow.entityName,
    entityId: outflow.entityId,
    reference: outflow.reference,
    amount: outflow.amount,
    isDraggable: false,
  }
}

export function CashCalendarPageClient({
  acumaticaInflows = [],
  acumaticaOutflows = [],
  currentCashPosition = null,
}: CashCalendarPageClientProps) {
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const currentCashPositionValue = currentCashPosition ?? INITIAL_BALANCE

  const mappedInflows = useMemo(
    () => acumaticaInflows.map(toCalendarInflowItem),
    [acumaticaInflows]
  )
  const mappedOutflows = useMemo(
    () => acumaticaOutflows.map(toCalendarOutflowItem),
    [acumaticaOutflows]
  )

  const expectedInflowsTotal = useMemo(
    () => mappedInflows.reduce((sum, inflow) => sum + inflow.amount, 0),
    [mappedInflows]
  )
  const apBillsTotal = useMemo(
    () => mappedOutflows.reduce((sum, outflow) => sum + outflow.amount, 0),
    [mappedOutflows]
  )

  const mergedCalendarItems = useMemo(() => {
    const scheduledMockOutflows = mockCalendarItems.filter(
      (item) => item.type === "outflow" && item.category === "scheduled"
    )

    return [...scheduledMockOutflows, ...mappedInflows, ...mappedOutflows].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )
  }, [mappedInflows, mappedOutflows])

  return (
    <>
      <div className="flex h-full flex-col">
        <PageHeader
          title="Cash Planning Calendar"
          subtitle="Drag payments to optimize cash flow &bull; Auto-execution enabled"
          actions={
            <>
              <button
                type="button"
                onClick={() => setSaveModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Save className="h-4 w-4" />
                Save Plan
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg bg-adz-blue px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-adz-blue/90"
              >
                <Play className="h-4 w-4" />
                Activate Plan
              </button>
            </>
          }
        />

        {/* Summary Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Landmark className="h-4 w-4" />}
            label="Current Cash Position"
            value={currentCashPositionValue}
            accentColor="blue"
            trend={{ value: 12.4, direction: "up", label: "+12.4% vs last month" }}
          />
          <SummaryCard
            icon={<ArrowDownLeft className="h-4 w-4" />}
            label="Expected Inflows (30d)"
            value={expectedInflowsTotal}
            accentColor="green"
            meta={`${mappedInflows.length} invoices from Acumatica`}
          />
          <SummaryCard
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Expected Outflows"
            value={apBillsTotal}
            accentColor="red"
            meta={`${mappedOutflows.length} bills from Acumatica`}
          />
          <SummaryCard
            icon={<Target className="h-4 w-4" />}
            label="Forecasted Balance (30d)"
            value={894384}
            accentColor="purple"
            meta="Above $200K threshold"
          />
        </div>

        {/* Calendar + Sidebar */}
        <div className="mt-5 flex flex-1 gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto adz-scrollbar">
            <CashCalendar
              initialItems={mergedCalendarItems}
              initialBalance={currentCashPositionValue}
            />
          </div>
          <CalendarSidebar />
        </div>
      </div>

      <SavePlanModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />
    </>
  )
}
