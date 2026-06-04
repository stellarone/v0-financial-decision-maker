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
  const base = new Date(tranDate);
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback.toISOString().slice(0, 10);
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
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
