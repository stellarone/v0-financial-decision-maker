/**
 * Request/response types for the platform-acumatica HTTP service.
 *
 * Self-contained: consumers should not need to copy any other file to get
 * full request/response typing. Types are ported from the server-side
 * `data/schemas/*.ts` (Zod inferred) and `data/types/*.ts`.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** All Acumatica entity fields are wrapped in this value envelope. */
export interface AcumaticaValue<T> {
  value: T;
}

/** "test" or "production" — identifies an Acumatica environment for an org. */
export type AcumaticaEnvironment = "test" | "production";

// ---------------------------------------------------------------------------
// POST /api/v1/auth/token
// POST /api/v1/auth/refresh
// POST /api/v1/auth/service-account
// ---------------------------------------------------------------------------

export interface TokenRequest {
  organizationId: string;
  userId?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** GET /api/v1/credentials */
export interface GetCredentialsQuery {
  organizationId: string;
  environment?: AcumaticaEnvironment;
}

/** GET /api/v1/credentials response */
export interface CredentialsMetadata {
  baseUrl: string;
  tenantName: string;
  status: string;
  environment: AcumaticaEnvironment;
}

export interface GetCredentialsResponse {
  credentials: CredentialsMetadata | null;
}

/** POST /api/v1/credentials */
export interface UpsertCredentialsInput {
  organizationId: string;
  baseUrl: string;
  tenantName: string;
  clientId: string;
  clientSecret: string;
  status?: string;
  environment?: AcumaticaEnvironment;
}

export interface UpsertCredentialsResponse {
  orgSystemId: string;
}

/** DELETE /api/v1/credentials */
export interface DeleteCredentialsInput {
  organizationId: string;
}

export interface DeleteCredentialsResponse {
  success: true;
}

// ---------------------------------------------------------------------------
// Account / financial entity types (Acumatica REST shape)
// ---------------------------------------------------------------------------

export interface AcumaticaAccount {
  AccountCD?: AcumaticaValue<string>;
  AccountID?: AcumaticaValue<number>;
  Description?: AcumaticaValue<string>;
  AccountClass?: AcumaticaValue<string>;
  ControlAccountModule?: AcumaticaValue<string>;
  Type?: AcumaticaValue<string>;
}

export interface AcumaticaBranch {
  BranchCD?: AcumaticaValue<string>;
  BranchName?: AcumaticaValue<string>;
  CompanyName?: AcumaticaValue<string>;
}

export interface AcumaticaTrialBalance {
  Account?: AcumaticaValue<string>;
  Description?: AcumaticaValue<string>;
  EndingBalance?: AcumaticaValue<number>;
  BranchID?: AcumaticaValue<string>;
  LedgerID?: AcumaticaValue<string>;
  FinancialPeriod?: AcumaticaValue<string>;
}

export interface AcumaticaCashSummary {
  Account?: AcumaticaValue<string> | string;
  AccountCD?: AcumaticaValue<string> | string;
  AccountID?: AcumaticaValue<string | number> | string | number;
  Description?: AcumaticaValue<string> | string;
  FinancialPeriod?: AcumaticaValue<string> | string;
  FinancialPeriodID?: AcumaticaValue<string> | string;
  PTDBalance?: AcumaticaValue<number | string> | number | string;
  CurrentBalance?: AcumaticaValue<number | string> | number | string;
  Balance?: AcumaticaValue<number | string> | number | string;
  CashBalance?: AcumaticaValue<number | string> | number | string;
  CuryBalance?: AcumaticaValue<number | string> | number | string;
  AvailableBalance?: AcumaticaValue<number | string> | number | string;
  [field: string]: unknown;
}

export interface AcumaticaUnprocessedBankTransaction {
  ID?: AcumaticaValue<number | string> | number | string;
  TranDate?: AcumaticaValue<string> | string;
  TranDesc?: AcumaticaValue<string> | string;
  CuryTranAmt?: AcumaticaValue<number | string> | number | string;
  DrCr?: AcumaticaValue<string> | string;
  EntryTypeID?: AcumaticaValue<string> | string;
  ExtRefNbr?: AcumaticaValue<string> | string;
  Processed?: AcumaticaValue<boolean | string> | boolean | string;
  CashAccount?: AcumaticaValue<string> | string;
  OrganizationID?: AcumaticaValue<string> | string;
  AccountID?: AcumaticaValue<string> | string;
  Matched?: AcumaticaValue<boolean | string> | boolean | string;
  Hidden?: AcumaticaValue<boolean | string> | boolean | string;
  Amount?: AcumaticaValue<number | string> | number | string;
  Date?: AcumaticaValue<string> | string;
  Description?: AcumaticaValue<string> | string;
  ExternalRef?: AcumaticaValue<string> | string;
  id?: AcumaticaValue<number | string> | number | string;
  TranID?: AcumaticaValue<number | string> | number | string;
  [field: string]: unknown;
}

export interface AcumaticaARInvoice {
  Type?: AcumaticaValue<string>;
  ReferenceNbr?: AcumaticaValue<string>;
  Status?: AcumaticaValue<string>;
  Amount?: AcumaticaValue<number>;
  Balance?: AcumaticaValue<number>;
  BatchNbr?: AcumaticaValue<string>;
  Customer?: AcumaticaValue<string>;
  CustomerName?: AcumaticaValue<string>;
  DocDate?: AcumaticaValue<string>;
  Date?: AcumaticaValue<string>;
  DueDate?: AcumaticaValue<string>;
  CustomerID?: AcumaticaValue<string>;
}

export interface AcumaticaAPBill {
  Type?: AcumaticaValue<string>;
  ReferenceNbr?: AcumaticaValue<string>;
  Status?: AcumaticaValue<string>;
  Amount?: AcumaticaValue<number>;
  Balance?: AcumaticaValue<number>;
  BatchNbr?: AcumaticaValue<string>;
  Vendor?: AcumaticaValue<string>;
  VendorName?: AcumaticaValue<string>;
  Date?: AcumaticaValue<string>;
  DueDate?: AcumaticaValue<string>;
  Description?: AcumaticaValue<string>;
  VendorRef?: AcumaticaValue<string>;
  DocDate?: AcumaticaValue<string>;
  VendorID?: AcumaticaValue<string>;
}

export interface AcumaticaAPAdjustment {
  Type?: AcumaticaValue<string>;
  ReferenceNbr?: AcumaticaValue<string>;
  Status?: AcumaticaValue<string>;
  Amount?: AcumaticaValue<number>;
  Balance?: AcumaticaValue<number>;
  BatchNbr?: AcumaticaValue<string>;
  DocDate?: AcumaticaValue<string>;
  VendorID?: AcumaticaValue<string>;
}

export interface AcumaticaINReceipt {
  ReferenceNbr?: AcumaticaValue<string>;
  Status?: AcumaticaValue<string>;
  TotalAmount?: AcumaticaValue<number>;
  BatchNbr?: AcumaticaValue<string>;
  Date?: AcumaticaValue<string>;
  Description?: AcumaticaValue<string>;
}

export interface AcumaticaLedger {
  LedgerCD: string;
  Description?: string;
  Type?: string;
}

// ---------------------------------------------------------------------------
// Accounts endpoints
// ---------------------------------------------------------------------------

export interface AccountsQuery {
  organizationId: string;
  accountClass?: string;
  /** Client-side filter — response is filtered to rows whose AccountCD is in this list. */
  accountCDs?: string[];
}

export interface TrialBalanceQuery {
  organizationId: string;
}

export interface CashSummaryQuery {
  organizationId: string;
}

export interface ExpenseAccountsLookupQuery {
  organizationId: string;
  search: string;
}

export interface AcumaticaExpenseAccount {
  accountNumber: string;
  description: string;
}

export interface AcumaticaExpenseAccountLookupResult {
  found: boolean;
  accountNumber: string | null;
  description: string | null;
}

// ---------------------------------------------------------------------------
// AP endpoints (AR open-invoices shares OpenBillsQuery shape via batchNbr)
// ---------------------------------------------------------------------------

export interface OpenBillsQuery {
  organizationId: string;
  batchNbr?: string;
}

export interface OpenARInvoicesQuery {
  organizationId: string;
  batchNbr?: string;
}

export interface ApAdjustmentsQuery {
  organizationId: string;
  batchNbr?: string;
}

export interface InReceiptsQuery {
  organizationId: string;
  batchNbr?: string;
}

export interface APAccountsQuery {
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export interface VendorLookupQuery {
  organizationId: string;
  vendorId?: string;
  vendorName?: string;
}

export interface VendorSearchQuery {
  organizationId: string;
  query: string;
  limit?: number;
}

export interface CreateVendorInput {
  organizationId: string;
  vendorName: string;
  vendorClass?: string;
  terms?: string;
  paymentMethod?: string;
  apAccount?: string;
  expenseAccount?: string;
}

/** AP-surface vendor query — supports vendorId, vendorName, or query+limit. */
export interface APVendorQuery {
  organizationId: string;
  vendorId?: string;
  vendorName?: string;
  query?: string;
  limit?: number;
}

export interface AcumaticaVendorLookupResult {
  found: boolean;
  vendorId: string | null;
  vendorName: string | null;
  terms: string | null;
}

export interface AcumaticaVendorSearchResult {
  vendors: Array<{ vendorId: string; vendorName: string }>;
  error: string | null;
}

export interface CreateAcumaticaVendorResult {
  vendorId: string;
}

// ---------------------------------------------------------------------------
// AP bills
// ---------------------------------------------------------------------------

export interface ConfidenceScores {
  overall: number;
  [field: string]: number;
}

export interface ParsedLineItem {
  line_number: number;
  description: string;
  inventory_id: string | null;
  quantity: number;
  unit_price: number;
  line_amount: number;
  expense_account: string | null;
  tax_code: string | null;
  confidence: ConfidenceScores;
}

export interface ReconciliationSummary {
  lineItemsSum: number;
  targetSubtotal: number;
  discrepancy: number;
  tolerance: number;
  passed: boolean;
}

export interface ParsedInvoice {
  vendor_name: string;
  vendor_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  terms: string | null;
  description: string | null;
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  ap_account: string | null;
  line_items: ParsedLineItem[];
  confidence: ConfidenceScores;
  warnings: string[];
  needs_human_review_reasons: string[];
  reconciliation?: ReconciliationSummary;
}

export interface CreateBillInput {
  organizationId: string;
  vendorId: string;
  invoice: ParsedInvoice;
}

export interface CreateAcumaticaBillResult {
  billId: string | null;
  referenceNbr: string | null;
}

// ---------------------------------------------------------------------------
// Recon
// ---------------------------------------------------------------------------

export interface ReconBatchQuery {
  organizationId: string;
  batchNbr?: string;
}

export interface BankTransactionMatchInput {
  organizationId: string;
  matchPayload: {
    CashAccount: AcumaticaValue<string>;
    ExtRefNbr: AcumaticaValue<string>;
    MatchDetails: Array<{
      Matched: AcumaticaValue<boolean>;
      Module: AcumaticaValue<string>;
      MatchType: AcumaticaValue<string>;
      InvoiceNbr: AcumaticaValue<string>;
      BusinessAccount: AcumaticaValue<string>;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Import scenarios
// ---------------------------------------------------------------------------

export type ImportEntityType =
  | "ChartOfAccounts"
  | "Customers"
  | "Vendors"
  | "StockItems"
  | "NonStockItems"
  | "OpenSalesOrders"
  | "OpenPurchaseOrders"
  | "InvoicesAndMemos"
  | "BillsAndAdjustments"
  | "InventoryBalance"
  | "TrialBalance"
  | "HistoricalSalesOrders"
  | "HistoricalPurchaseOrders"
  | "HistoricalInvoices"
  | "HistoricalBills";

export interface ExecuteImportInput {
  organizationId: string;
}

export interface ExecuteWithVerificationInput {
  organizationId: string;
  /** Total time to wait for completion (ms). Server caps at 5 minutes. */
  timeoutMs?: number;
  /** Gap between verification polls (ms). Server caps at 30 seconds. */
  pollIntervalMs?: number;
}

export interface ExecuteImportResponse {
  triggered: true;
  startedAt: string;
}

export interface ImportScenarioSnapshot {
  scenarioName: string;
  status?: string;
  numberOfRecords?: number;
  preparedOn?: string;
  completedOn?: string;
}

export interface ImportScenarioFieldMapping {
  fieldName: string;
  sourceField: string;
}

export interface ImportScenarioMappingSnapshot extends ImportScenarioSnapshot {
  mappings: ImportScenarioFieldMapping[];
}

export interface ImportScenarioExecutionResult {
  entityType: ImportEntityType;
  scenarioName: string;
  triggerResponse: unknown;
  verified: boolean;
  freshRunDetected: boolean;
  before: ImportScenarioSnapshot | null;
  after: ImportScenarioSnapshot | null;
}

export interface MappingsQuery {
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Substitution lists
// ---------------------------------------------------------------------------

export interface SubstitutionMapping {
  source_value: string;
  target_value: string;
}

export interface SubstitutionListState {
  listName: string;
  exists: boolean;
  values: string[];
}

export interface ListStateQuery {
  organizationId: string;
}

export interface ListPushInput {
  organizationId: string;
  items: SubstitutionMapping[];
}

export interface CheckPushSubstitutionListsInput {
  organizationId: string;
  listName: string;
  items: SubstitutionMapping[];
}

export interface CheckPushResponse {
  pushed: boolean;
  rowCount: number;
}

export interface ProspectMappingRow {
  sourceValue?: string | null;
  acuValue?: string | null;
}

// ---------------------------------------------------------------------------
// Migration mode
// ---------------------------------------------------------------------------

export type MigrationModeType = "AR" | "AP";

export interface MigrationModeBody {
  organizationId: string;
  id: string;
}

export interface MigrationModeIdQuery {
  organizationId: string;
}

export interface MigrationModeIdResponse {
  id: string;
}

// ---------------------------------------------------------------------------
// Maintenance mode
// ---------------------------------------------------------------------------

export interface EnableMaintenanceInput {
  organizationId: string;
  reason: string;
}

export interface DisableMaintenanceInput {
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Tenant reads
// ---------------------------------------------------------------------------

export interface TenantReadQuery {
  organizationId: string;
}

export type ReferenceListName = "credit-terms" | "payment-methods" | "ship-via";

// ---------------------------------------------------------------------------
// Entities (generic create)
// ---------------------------------------------------------------------------

export interface CreateEntityBody {
  organizationId: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tenant provisioning (stub endpoints)
// ---------------------------------------------------------------------------

export interface CreateTenantInput {
  /** camelCase preferred; legacy snake_case is accepted server-side. */
  organizationId?: string;
  organization_id?: string;
  sessionId?: string;
  session_id?: string;
  triggerSource?: string;
  trigger_source?: string;
}

export interface CreateTenantResponse {
  triggered: true;
  startedAt: string;
  organizationId?: string;
  sessionId: string | null;
  triggerSource: string;
  note: string;
}

export interface PushSubstitutionListsInput {
  organization_id: string;
  substitution_list_name: string;
  mappings: SubstitutionMapping[];
}

export interface ApplyModuleConfigurationInput {
  organization_id: string;
  module: string;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: "ok";
  service: "platform-acumatica";
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Envelope (returned by every endpoint prior to the client unwrapping `.data`)
// ---------------------------------------------------------------------------

export type AcumaticaApiResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; fields?: Record<string, string> };
    };
