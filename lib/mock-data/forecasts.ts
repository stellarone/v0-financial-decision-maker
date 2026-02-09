import type { CashForecast } from "@/lib/types"

// Repeatable inflow/outflow templates keyed by day-of-month
const inflowTemplates: Record<number, { name: string; amount: number; confidence: number }[]> = {
  3: [{ name: "Acme Corp", amount: 24500, confidence: 96 }],
  5: [{ name: "Bright Solutions", amount: 15800, confidence: 88 }],
  9: [{ name: "Metro Retail Group", amount: 67800, confidence: 94 }],
  12: [{ name: "Summit Enterprises", amount: 31200, confidence: 82 }],
  14: [{ name: "Pacific Trading", amount: 19400, confidence: 72 }],
  18: [{ name: "North Star Industries", amount: 42300, confidence: 90 }],
  20: [{ name: "Greenfield Partners", amount: 28900, confidence: 85 }],
  23: [{ name: "Delta Corp", amount: 55600, confidence: 78 }],
  26: [{ name: "Westside Distribution", amount: 37500, confidence: 91 }],
  28: [{ name: "TechForward Inc", amount: 21200, confidence: 68 }],
}

const outflowTemplates: Record<number, { name: string; amount: number }[]> = {
  4: [{ name: "Raw Materials Co", amount: 18200 }],
  5: [{ name: "City Utilities", amount: 3450 }],
  7: [{ name: "Logistics Plus", amount: 12600 }],
  9: [{ name: "Insurance Premium", amount: 4200 }],
  10: [{ name: "Equipment Supplier", amount: 45000 }],
  12: [{ name: "Kiln Services", amount: 8400 }],
  16: [{ name: "Office Rent", amount: 8500 }],
  18: [{ name: "Clay Supply Co", amount: 22100 }],
  21: [{ name: "Marketing Agency", amount: 6200 }],
  24: [{ name: "Payroll", amount: 86400 }],
  25: [{ name: "Cloud Hosting", amount: 3800 }],
  27: [{ name: "New Vendor LLC", amount: 8200 }],
}

// Pseudo-random multiplier seeded by month to create realistic variance
function monthVariance(month: number, base: number): number {
  const seasonality = [0.92, 0.95, 1.0, 1.05, 1.08, 1.1, 1.12, 1.1, 1.06, 1.03, 0.98, 0.94]
  return Math.round(base * (seasonality[month % 12] || 1))
}

function buildAllForecasts(): CashForecast[] {
  const data: CashForecast[] = []
  let balance = 847234
  const startDate = new Date(2026, 1, 1) // Feb 1, 2026
  const endDate = new Date(2027, 1, 1) // Feb 1, 2027 = 12 months

  const current = new Date(startDate)
  let dayCounter = 0

  while (current < endDate) {
    const year = current.getFullYear()
    const month = current.getMonth()
    const dayOfMonth = current.getDate()

    // Get inflows/outflows for this day-of-month, apply monthly variance
    const monthIdx = (month - 1 + 12) % 12
    const dayInflowItems = (inflowTemplates[dayOfMonth] || []).map((item) => ({
      ...item,
      amount: monthVariance(monthIdx, item.amount),
    }))
    const dayOutflowItems = (outflowTemplates[dayOfMonth] || []).map((item) => ({
      ...item,
      amount: monthVariance(monthIdx, item.amount),
    }))

    const inflows = dayInflowItems.reduce((sum, i) => sum + i.amount, 0)
    const outflows = dayOutflowItems.reduce((sum, i) => sum + i.amount, 0)

    const openingBalance = balance
    balance = balance + inflows - outflows

    data.push({
      date: new Date(year, month, dayOfMonth),
      openingBalance,
      inflows,
      outflows,
      closingBalance: balance,
      inflowItems: dayInflowItems.map((item, idx) => ({
        id: `fi-${dayCounter}-${idx}`,
        entityName: item.name,
        amount: item.amount,
        confidence: item.confidence,
        category: "AR",
      })),
      outflowItems: dayOutflowItems.map((item, idx) => ({
        id: `fo-${dayCounter}-${idx}`,
        entityName: item.name,
        amount: item.amount,
        confidence: 100,
        category: "AP",
      })),
    })

    dayCounter++
    current.setDate(current.getDate() + 1)
  }

  return data
}

export const mockForecastData: CashForecast[] = buildAllForecasts()

// "Today" is Feb 9, 2026
const TODAY = new Date(2026, 1, 9)

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export type TimeRange = "7D" | "30D" | "90D" | "12M"

export function getFilteredForecast(range: TimeRange): {
  data: CashForecast[]
  todayIndex: number
  labelInterval: number
  dateFormat: (d: Date) => string
} {
  let daysBack: number
  let daysForward: number
  let labelInterval: number
  let dateFormat: (d: Date) => string

  switch (range) {
    case "7D":
      daysBack = 3
      daysForward = 4
      labelInterval = 0
      dateFormat = (d) => {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return `${dayNames[d.getDay()]} ${d.getDate()}`
      }
      break
    case "30D":
      daysBack = 8
      daysForward = 22
      labelInterval = 4
      dateFormat = (d) => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return `${monthNames[d.getMonth()]} ${d.getDate()}`
      }
      break
    case "90D":
      daysBack = 8
      daysForward = 82
      labelInterval = 13
      dateFormat = (d) => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return `${monthNames[d.getMonth()]} ${d.getDate()}`
      }
      break
    case "12M":
      daysBack = 8
      daysForward = 357
      labelInterval = 29
      dateFormat = (d) => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`
      }
      break
  }

  const startDay = new Date(TODAY)
  startDay.setDate(startDay.getDate() - daysBack)

  const endDay = new Date(TODAY)
  endDay.setDate(endDay.getDate() + daysForward)

  const filtered = mockForecastData.filter((d) => d.date >= startDay && d.date <= endDay)
  const todayIndex = filtered.findIndex(
    (d) => d.date.getFullYear() === TODAY.getFullYear() && d.date.getMonth() === TODAY.getMonth() && d.date.getDate() === TODAY.getDate()
  )

  return { data: filtered, todayIndex, labelInterval, dateFormat }
}

export function getWeeklyBreakdown(data: CashForecast[]): { week: string; inflows: number; outflows: number; net: number }[] {
  const weeks: { week: string; inflows: number; outflows: number; net: number }[] = []
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  for (let i = 0; i < data.length; i += 7) {
    const slice = data.slice(i, i + 7)
    if (slice.length === 0) break
    const first = slice[0]
    const weekInflows = slice.reduce((s, d) => s + d.inflows, 0)
    const weekOutflows = slice.reduce((s, d) => s + d.outflows, 0)
    weeks.push({
      week: `Week of ${monthNames[first.date.getMonth()]} ${first.date.getDate()}`,
      inflows: weekInflows,
      outflows: weekOutflows,
      net: weekInflows - weekOutflows,
    })
  }

  return weeks
}

export function getInflowItems(data: CashForecast[]): {
  id: string
  customerName: string
  expectedDate: string
  confidence: number
  amount: number
}[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const items: { id: string; customerName: string; expectedDate: string; confidence: number; amount: number }[] = []

  for (const day of data) {
    for (const item of day.inflowItems) {
      items.push({
        id: item.id,
        customerName: item.entityName,
        expectedDate: `${monthNames[day.date.getMonth()]} ${day.date.getDate()}`,
        confidence: item.confidence,
        amount: item.amount,
      })
    }
  }

  return items.sort((a, b) => b.amount - a.amount)
}
