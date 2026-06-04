type AcumaticaField<T> = { value: T };

function unwrapString(field: unknown): string | undefined {
  if (field == null) return undefined;
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "value" in field) {
    const v = (field as { value: unknown }).value;
    return v == null ? undefined : String(v);
  }
  return undefined;
}

export type BankTransactionDrCr = "Receipt" | "Disbursement";

export function resolveBankTransactionDrCr(
  bankTransaction: Record<string, unknown>
): BankTransactionDrCr {
  const raw = bankTransaction.drCr ?? bankTransaction.DrCr;
  if (raw === "Receipt" || raw === "Disbursement") {
    return raw;
  }
  throw new Error(
    `Cannot determine whether this bank transaction is a receipt or disbursement (drCr: ${String(raw)}). Run reconciliation again or use Match.`
  );
}

export function extractCounterpartyFromGpt(
  gptResponse: Record<string, unknown> | null
): { vendor?: string; customer?: string } {
  const candidate = gptResponse?.matched_candidate as Record<string, unknown> | undefined;
  const vendor = candidate?.vendor;
  const customer = candidate?.customer;
  return {
    vendor: typeof vendor === "string" && vendor.trim() ? vendor.trim() : undefined,
    customer:
      typeof customer === "string" && customer.trim() ? customer.trim() : undefined,
  };
}

export function dueDateFromTranDate(tranDate: string, days = 30): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(tranDate);
  if (match) {
    const base = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(tranDate);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, "0");
    const d = String(fallback.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  parsed.setDate(parsed.getDate() + days);
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function acumaticaReferenceNbr(result: unknown): string | undefined {
  const record = result as Record<string, unknown> | null;
  if (!record) return undefined;
  return unwrapString(record.ReferenceNbr);
}

export function buildApBillPayload(params: {
  vendorId: string;
  tranDate: string;
  description: string;
  amount: number;
  expenseAccount: string;
}): Record<string, AcumaticaField<string | number | object[]>> {
  const amount = Math.abs(params.amount);
  const dueDate = dueDateFromTranDate(params.tranDate);

  return {
    Type: { value: "Bill" },
    Vendor: { value: params.vendorId },
    Date: { value: params.tranDate },
    DueDate: { value: dueDate },
    Terms: { value: "NET30" },
    Description: { value: params.description },
    Details: [
      {
        Description: { value: params.description },
        Qty: { value: 1 },
        UnitCost: { value: amount },
        Amount: { value: amount },
        Account: { value: params.expenseAccount },
      },
    ],
  };
}

export function buildArInvoicePayload(params: {
  customerId: string;
  tranDate: string;
  description: string;
  amount: number;
}): Record<string, AcumaticaField<string | number | object[]>> {
  const amount = Math.abs(params.amount);
  const dueDate = dueDateFromTranDate(params.tranDate);

  return {
    Type: { value: "Invoice" },
    Customer: { value: params.customerId },
    Date: { value: params.tranDate },
    DueDate: { value: dueDate },
    Terms: { value: "NET30" },
    Description: { value: params.description },
    Details: [
      {
        Description: { value: params.description },
        Qty: { value: 1 },
        UnitCost: { value: amount },
        Amount: { value: amount },
      },
    ],
  };
}
