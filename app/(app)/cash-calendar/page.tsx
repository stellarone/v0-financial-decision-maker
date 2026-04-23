import { CashCalendarPageClient } from "@/components/calendar/cash-calendar-page-client"
import { loadCalendarInflowsFromARInvoices } from "@/lib/cash-planning/calendar-inflows"
import { loadCalendarOutflowsFromAPBills } from "@/lib/cash-planning/calendar-outflows"

export default async function CashCalendarPage() {
  const [acumaticaInflows, acumaticaOutflows] = await Promise.all([
    loadCalendarInflowsFromARInvoices(),
    loadCalendarOutflowsFromAPBills(),
  ])

  return (
    <CashCalendarPageClient
      acumaticaInflows={acumaticaInflows}
      acumaticaOutflows={acumaticaOutflows}
    />
  )
}
