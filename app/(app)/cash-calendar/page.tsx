import { CashCalendarPageClient } from "@/components/calendar/cash-calendar-page-client"
import { loadCalendarInflowsFromARInvoices } from "@/lib/cash-planning/calendar-inflows"
import { loadCalendarOutflowsFromAPBills } from "@/lib/cash-planning/calendar-outflows"
import { loadCurrentCashPositionFromCashSummary } from "@/lib/cash-planning/current-cash-position"

export default async function CashCalendarPage() {
  const organizationId = process.env.DEV_ORGANIZATION_ID ?? ""

  const [acumaticaInflows, acumaticaOutflows, currentCashPosition] = await Promise.all([
    organizationId ? loadCalendarInflowsFromARInvoices(organizationId) : Promise.resolve([]),
    organizationId ? loadCalendarOutflowsFromAPBills(organizationId) : Promise.resolve([]),
    organizationId ? loadCurrentCashPositionFromCashSummary(organizationId) : Promise.resolve(null),
  ])

  return (
    <CashCalendarPageClient
      acumaticaInflows={acumaticaInflows}
      acumaticaOutflows={acumaticaOutflows}
      currentCashPosition={currentCashPosition}
    />
  )
}
