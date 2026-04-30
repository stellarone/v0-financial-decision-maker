import { CashCalendarPageClient } from "@/components/calendar/cash-calendar-page-client"
import { loadCalendarInflowsFromARInvoices } from "@/lib/cash-planning/calendar-inflows"
import { loadCalendarOutflowsFromAPBills } from "@/lib/cash-planning/calendar-outflows"
import { withAuth } from "@/lib/services/app/auth/guards"

export default async function CashCalendarPage() {
  const auth = await withAuth()
  const organizationId = auth.organization.id

  if (!organizationId) {
    throw new Error("Missing organization id for authenticated user.")
  }

  const [acumaticaInflows, acumaticaOutflows] = await Promise.all([
    loadCalendarInflowsFromARInvoices(organizationId),
    loadCalendarOutflowsFromAPBills(organizationId),
  ])

  return (
    <CashCalendarPageClient
      acumaticaInflows={acumaticaInflows}
      acumaticaOutflows={acumaticaOutflows}
    />
  )
}
