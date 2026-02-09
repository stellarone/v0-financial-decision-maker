import type { CashForecast } from "@/lib/types"

function buildForecasts(): CashForecast[] {
  const data: CashForecast[] = []
  let balance = 847234

  const inflowSchedule: Record<number, { name: string; amount: number; confidence: number }[]> = {
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

  const outflowSchedule: Record<number, { name: string; amount: number }[]> = {
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

  for (let day = 1; day <= 28; day++) {
    const date = new Date(2026, 1, day) // Feb 2026
    const dayInflowItems = inflowSchedule[day] || []
    const dayOutflowItems = outflowSchedule[day] || []

    const inflows = dayInflowItems.reduce((sum, i) => sum + i.amount, 0)
    const outflows = dayOutflowItems.reduce((sum, i) => sum + i.amount, 0)

    const openingBalance = balance
    balance = balance + inflows - outflows

    data.push({
      date,
      openingBalance,
      inflows,
      outflows,
      closingBalance: balance,
      inflowItems: dayInflowItems.map((item, idx) => ({
        id: `fi-${day}-${idx}`,
        entityName: item.name,
        amount: item.amount,
        confidence: item.confidence,
        category: "AR",
      })),
      outflowItems: dayOutflowItems.map((item, idx) => ({
        id: `fo-${day}-${idx}`,
        entityName: item.name,
        amount: item.amount,
        confidence: 100,
        category: "AP",
      })),
    })
  }

  return data
}

export const mockForecastData: CashForecast[] = buildForecasts()
