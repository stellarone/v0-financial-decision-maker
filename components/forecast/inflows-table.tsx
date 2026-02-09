import { ConfidenceBar } from "@/components/shared/confidence-bar"
import { CurrencyDisplay } from "@/components/shared/currency-display"
import { ArrowDownLeft } from "lucide-react"

interface InflowItem {
  id: string
  customerName: string
  invoiceNumber: string
  expectedDate: string
  confidence: number
  amount: number
}

const inflowsData: InflowItem[] = [
  { id: "i1", customerName: "Metro Retail Group", invoiceNumber: "INV-2026-0880", expectedDate: "Feb 9", confidence: 94, amount: 67800 },
  { id: "i2", customerName: "Delta Corp", invoiceNumber: "INV-2026-0918", expectedDate: "Feb 23", confidence: 78, amount: 55600 },
  { id: "i3", customerName: "North Star Industries", invoiceNumber: "INV-2026-0902", expectedDate: "Feb 18", confidence: 90, amount: 42300 },
  { id: "i4", customerName: "Westside Distribution", invoiceNumber: "INV-2026-0925", expectedDate: "Feb 26", confidence: 91, amount: 37500 },
  { id: "i5", customerName: "Summit Enterprises", invoiceNumber: "INV-2026-0890", expectedDate: "Feb 12", confidence: 82, amount: 31200 },
  { id: "i6", customerName: "Greenfield Partners", invoiceNumber: "INV-2026-0910", expectedDate: "Feb 20", confidence: 85, amount: 28900 },
  { id: "i7", customerName: "Acme Corp", invoiceNumber: "INV-2026-0865", expectedDate: "Feb 3", confidence: 96, amount: 24500 },
  { id: "i8", customerName: "TechForward Inc", invoiceNumber: "INV-2026-0930", expectedDate: "Feb 28", confidence: 68, amount: 21200 },
  { id: "i9", customerName: "Pacific Trading", invoiceNumber: "INV-2026-0895", expectedDate: "Feb 14", confidence: 72, amount: 19400 },
  { id: "i10", customerName: "Bright Solutions", invoiceNumber: "INV-2026-0871", expectedDate: "Feb 5", confidence: 88, amount: 15800 },
]

const totalInflows = inflowsData.reduce((sum, i) => sum + i.amount, 0)

export function InflowsTable() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-adz-green" />
          <h3 className="text-sm font-semibold text-foreground">
            Expected Inflows
          </h3>
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
            {inflowsData.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2.5">
                  <div>
                    <p className="font-medium text-foreground">
                      {item.customerName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.invoiceNumber}
                    </p>
                  </div>
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
    </div>
  )
}
