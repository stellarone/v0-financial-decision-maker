import type { Insight } from "@/lib/types"

export const mockInsights: Insight[] = [
  {
    id: "ins-1",
    type: "opportunity",
    title: "Early Payment Discount Available",
    description:
      "Equipment Supplier Inc offers 2% discount for payment within 10 days. Moving the $45,000 payment from Feb 15 to Feb 10 would save $900.",
    relatedEntityId: "vend_005",
    suggestedAction: "Move payment to Feb 10",
    createdAt: new Date("2026-02-08T10:00:00"),
  },
  {
    id: "ins-2",
    type: "warning",
    title: "Cash Position Below Threshold by Feb 24",
    description:
      "Payroll processing on Feb 24 ($86,400) may push balance below the $200K minimum threshold. Consider accelerating collections from Delta Corp or deferring non-critical payments.",
    createdAt: new Date("2026-02-09T06:00:00"),
  },
  {
    id: "ins-3",
    type: "risk",
    title: "Collection Risk: Pacific Trading",
    description:
      "Pacific Trading has a 72% on-time confidence score, down from 89% last quarter. Their $19,400 payment expected Feb 14 may be delayed 5-7 days based on recent patterns.",
    relatedEntityId: "cust_005",
    createdAt: new Date("2026-02-08T14:00:00"),
  },
  {
    id: "ins-4",
    type: "opportunity",
    title: "Vendor Payment Consolidation",
    description:
      "3 payments to logistics vendors total $32,800 this month. Consolidating into a single weekly batch could reduce ACH fees by $45 and simplify reconciliation.",
    suggestedAction: "Set up vendor batching",
    createdAt: new Date("2026-02-07T09:00:00"),
  },
  {
    id: "ins-5",
    type: "warning",
    title: "TechForward Inc Payment Trending Late",
    description:
      "TechForward Inc's $21,200 payment has a 68% confidence score. Their last 3 payments averaged 8 days late. Plan for potential delay to early March.",
    relatedEntityId: "cust_010",
    createdAt: new Date("2026-02-09T08:00:00"),
  },
  {
    id: "ins-6",
    type: "opportunity",
    title: "Surplus Cash Investment Window",
    description:
      "Between Feb 9-22, projected balance exceeds $900K. Consider moving $200K to high-yield savings (4.8% APY) for approximately $526 in additional interest income.",
    suggestedAction: "Transfer to savings",
    createdAt: new Date("2026-02-09T07:00:00"),
  },
  {
    id: "ins-7",
    type: "risk",
    title: "Recurring Payment Increase Detected",
    description:
      "Cloud Hosting bill increased 15% from last month ($3,300 to $3,800). This may indicate usage growth or a pricing change. Review subscription plan.",
    relatedEntityId: "vend_011",
    createdAt: new Date("2026-02-08T16:00:00"),
  },
]
