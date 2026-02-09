export interface Company {
  id: string
  name: string
  timezone: string
  currency: string
  cashThreshold: number
  autonomousEnabled: boolean
}

export interface BankAccount {
  id: string
  name: string
  institution: string
  accountType: "checking" | "savings" | "credit"
  balance: number
  lastUpdated: Date
}

export interface CashPosition {
  totalBalance: number
  accounts: BankAccount[]
  asOf: Date
}

export interface CalendarItem {
  id: string
  date: Date
  type: "inflow" | "outflow"
  category: "expected" | "due" | "scheduled" | "recurring"
  entityName: string
  entityId: string
  reference: string
  amount: number
  confidence?: number
  isDraggable: boolean
  originalDueDate?: Date
  paymentMethod?: string
}

export interface CashForecast {
  date: Date
  openingBalance: number
  inflows: number
  outflows: number
  closingBalance: number
  inflowItems: ForecastItem[]
  outflowItems: ForecastItem[]
}

export interface ForecastItem {
  id: string
  entityName: string
  amount: number
  confidence: number
  category: string
}

export type ExecutionStatus =
  | "scheduled"
  | "pending_approval"
  | "executing"
  | "completed"
  | "failed"
  | "held"

export type PaymentMethod = "ACH" | "Wire" | "Check" | "Card"

export interface Approver {
  userId: string
  name: string
  status: "pending" | "approved" | "rejected"
  timestamp?: Date
}

export interface AuditEntry {
  timestamp: Date
  action: string
  userId: string
  userName: string
  details?: string
}

export interface ExecutionItem {
  id: string
  type: "payment" | "collection"
  status: ExecutionStatus
  entityName: string
  entityId: string
  reference: string
  terms: string
  amount: number
  scheduledDate: Date
  scheduledTime: string
  method: PaymentMethod
  accountLastFour: string
  autoExecuteCountdown?: string
  requiresApproval: boolean
  approvers?: Approver[]
  failureReason?: string
  executedAt?: Date
  auditLog: AuditEntry[]
}

export interface Insight {
  id: string
  type: "opportunity" | "warning" | "risk"
  title: string
  description: string
  relatedEntityId?: string
  suggestedAction?: string
  createdAt: Date
}

export interface Scenario {
  paymentDelayDays: number
  revenueVariancePercent: number
  expenseIncreasePercent: number
}
