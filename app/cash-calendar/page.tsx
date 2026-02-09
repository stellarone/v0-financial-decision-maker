"use client"

import { useState } from "react"
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

const INITIAL_BALANCE = 847234

export default function CashCalendarPage() {
  const [saveModalOpen, setSaveModalOpen] = useState(false)

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
            value={INITIAL_BALANCE}
            accentColor="blue"
            trend={{ value: 12.4, direction: "up", label: "+12.4% vs last month" }}
          />
          <SummaryCard
            icon={<ArrowDownLeft className="h-4 w-4" />}
            label="Expected Inflows (30d)"
            value={344200}
            accentColor="green"
            meta="23 invoices &bull; 89% predicted on-time"
          />
          <SummaryCard
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Scheduled Outflows (30d)"
            value={297050}
            accentColor="red"
            meta="47 payments &bull; 12 auto-scheduled"
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
              initialItems={mockCalendarItems}
              initialBalance={INITIAL_BALANCE}
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
