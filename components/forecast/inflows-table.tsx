import { ConfidenceBar } from "@/components/shared/confidence-bar"
import { CurrencyDisplay } from "@/components/shared/currency-display"
import { ArrowDownLeft } from "lucide-react"

interface InflowItem {
  id: string
  customerName: string
  expectedDate: string
  confidence: number
  amount: number
}

interface InflowsTableProps {
  items: InflowItem[]
}

export function InflowsTable({ items }: InflowsTableProps) {
  const totalInflows = items.reduce((sum, i) => sum + i.amount, 0)
  const displayItems = items.slice(0, 12)

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-adz-green" />
          <h3 className="text-sm font-semibold text-foreground">
            Expected Inflows
          </h3>
          <span className="text-xs text-muted-foreground">
            ({items.length} payments)
          </span>
        </div>
        <CurrencyDisplay value={totalInflows} size="md" colorCode />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Customer
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground">
                Expected
              </th>
              <th className="pb-2 text-left font-medium text-muted-foreground w-28">
                Confidence
              </th>
              <th className="pb-2 text-right font-medium text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2.5">
                  <p className="font-medium text-foreground">
                    {item.customerName}
                  </p>
                </td>
                <td className="py-2.5 text-muted-foreground">
                  {item.expectedDate}
                </td>
                <td className="py-2.5">
                  <ConfidenceBar value={item.confidence} size="sm" />
                </td>
                <td className="py-2.5 text-right">
                  <CurrencyDisplay
                    value={item.amount}
                    showSign
                    colorCode
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 12 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          + {items.length - 12} more expected inflows
        </p>
      )}
    </div>
  )
}
