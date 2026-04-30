import { CashCalendarPageClient } from "@/components/calendar/cash-calendar-page-client"
import { loadCalendarInflowsFromARInvoices } from "@/lib/cash-planning/calendar-inflows"
import { loadCalendarOutflowsFromAPBills } from "@/lib/cash-planning/calendar-outflows"

export default async function CashCalendarPage() {
  const organizationId = process.env.DEV_ORGANIZATION_ID ?? ""

  const [acumaticaInflows, acumaticaOutflows] = await Promise.all([
    organizationId ? loadCalendarInflowsFromARInvoices(organizationId) : Promise.resolve([]),
    organizationId ? loadCalendarOutflowsFromAPBills(organizationId) : Promise.resolve([]),
  ])

  return (
    <CashCalendarPageClient
      acumaticaInflows={acumaticaInflows}
      acumaticaOutflows={acumaticaOutflows}
    />
  )
}
