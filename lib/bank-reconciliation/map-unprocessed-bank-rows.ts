import type {
  AcumaticaUnprocessedBankTransaction,
} from "@/lib/clients/types";
import type {
  BankTransactionInserted,
  BankTransactionWebhookPayload,
} from "@/data/types/bank-reconciliation";

function unwrapField<T>(field: unknown): T | null {
  if (field === null || field === undefined) return null;
  if (typeof field === "object" && field !== null && "value" in field) {
    const inner = (field as { value: unknown }).value;
    if (inner === null || inner === undefined) return null;
    return inner as T;
  }
  return field as T;
}

function unwrapString(field: unknown): string | null {
  const value = unwrapField<string | number>(field);
  if (value === null) return null;
  return String(value);
}

function unwrapNumber(field: unknown): number {
  const value = unwrapField<string | number>(field);
  if (value === null) return 0;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrapBoolean(field: unknown): boolean {
  const value = unwrapField<boolean | string>(field);
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function normalizeDrCr(value: string | null): "Receipt" | "Disbursement" {
  if (!value) return "Receipt";
  const normalized = value.toLowerCase();
  if (normalized.includes("disburse") || normalized === "dr") {
    return "Disbursement";
  }
  return "Receipt";
}

function normalizeAccountId(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function accountIdMatchesCompany(
  row: AcumaticaUnprocessedBankTransaction,
  acumaticaCompanyId: string
): boolean {
  const accountId = normalizeAccountId(unwrapString(row.AccountID));
  const companyId = normalizeAccountId(acumaticaCompanyId);
  if (!accountId || !companyId) {
    return false;
  }
  return accountId === companyId;
}

export function mapUnprocessedRowToInserted(
  row: AcumaticaUnprocessedBankTransaction,
  organizationId: string,
  acumaticaCompanyId: string
): BankTransactionInserted | null {
  const rowOrgId = unwrapString(row.OrganizationID);
  if (rowOrgId && rowOrgId !== organizationId) {
    return null;
  }

  if (!rowOrgId && !accountIdMatchesCompany(row, acumaticaCompanyId)) {
    return null;
  }

  if (unwrapBoolean(row.Processed) || unwrapBoolean(row.Matched) || unwrapBoolean(row.Hidden)) {
    return null;
  }

  const tranIdRaw =
    unwrapField<number | string>(row.ID) ??
    unwrapField<number | string>(row.id) ??
    unwrapField<number | string>(row.TranID);
  if (tranIdRaw === null || tranIdRaw === undefined) {
    return null;
  }

  const tranId =
    typeof tranIdRaw === "number" ? tranIdRaw : parseInt(String(tranIdRaw), 10);
  if (!Number.isFinite(tranId)) {
    return null;
  }

  const extRefNbr = unwrapString(row.ExtRefNbr) ?? unwrapString(row.ExternalRef) ?? "";
  const tranDate =
    unwrapString(row.TranDate) ?? unwrapString(row.Date) ?? new Date().toISOString();
  const description =
    unwrapString(row.TranDesc) ?? unwrapString(row.Description) ?? "";
  const amount = unwrapNumber(row.CuryTranAmt ?? row.Amount);
  const drCr = normalizeDrCr(unwrapString(row.DrCr));
  const cashAccount =
    (unwrapString(row.CashAccount) ?? "1000").trim() || "1000";

  return {
    ID: tranId,
    TranDate: tranDate,
    TranDesc: description,
    CuryTranAmt: amount,
    DrCr: drCr,
    EntryTypeID: unwrapString(row.EntryTypeID),
    ExtRefNbr: extRefNbr,
    Processed: false,
    CashAccount: cashAccount,
    OrganizationID: organizationId,
  };
}

export function buildWebhookPayloadFromUnprocessedRows(
  rows: AcumaticaUnprocessedBankTransaction[],
  organizationId: string,
  acumaticaCompanyId: string
): BankTransactionWebhookPayload {
  const inserted = rows
    .map((row) => mapUnprocessedRowToInserted(row, organizationId, acumaticaCompanyId))
    .filter((txn): txn is BankTransactionInserted => txn !== null);

  return {
    Inserted: inserted,
    Deleted: [],
    Query: "Bank-UnprocessedTransactions",
    CompanyId: acumaticaCompanyId,
    Id: `scheduled-bank-recon-${Date.now()}`,
    TimeStamp: Date.now(),
  };
}
