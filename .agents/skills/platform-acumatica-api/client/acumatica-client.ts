/**
 * AcumaticaClient — typed HTTP client for the platform-acumatica service.
 *
 * Zero runtime dependencies (uses global fetch). Consumer apps drop this
 * file, `types.ts`, `errors.ts`, and `filter.ts` into `lib/clients/` and
 * instantiate a single client instance per request (or per app, if the
 * service-role key is long-lived).
 *
 * Every method returns the already-unwrapped `.data` payload from the
 * service envelope (`{ success: true, data: ... }`). On failure the
 * client throws {@link AcumaticaError} with the service's error code +
 * HTTP status so callers can branch on error.code / error.status.
 */

import { AcumaticaError, type AcumaticaErrorCode } from "./errors";
import type * as T from "./types";

export interface AcumaticaClientOptions {
  /** Base URL of the platform-acumatica service, e.g. `https://acumatica.stellarone.ai`. */
  baseUrl: string;
  /** Supabase service-role key used for service-to-service auth. */
  serviceRoleKey: string;
  /** Short identifier of the calling app (e.g. `member-portal`). Sent as `x-stellar-app`. */
  sourceApp: string;
  /** User JWT for audit; REQUIRED for Profile B endpoints (credentials writes, maintenance-mode, migration-mode). */
  userJwt?: string;
  /** Optional correlation id; forwarded as `x-stellar-request-id`. */
  requestId?: string;
  /** Override for fetch (useful in tests). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

type CallInit = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export class AcumaticaClient {
  private readonly opts: AcumaticaClientOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AcumaticaClientOptions) {
    this.opts = opts;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error(
        "AcumaticaClient: global fetch is not available. Provide opts.fetch explicitly."
      );
    }
  }

  // ==========================================================================
  // Shared request path
  // ==========================================================================

  private async call<R>(path: string, init: CallInit = {}): Promise<R> {
    const url = new URL(`${this.opts.baseUrl}/api/v1${path}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.opts.serviceRoleKey}`,
      "x-stellar-app": this.opts.sourceApp,
    };
    if (this.opts.userJwt) headers["x-stellar-user-jwt"] = this.opts.userJwt;
    if (this.opts.requestId) headers["x-stellar-request-id"] = this.opts.requestId;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";

    const res = await this.fetchImpl(url.toString(), {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const json = (await res.json().catch(() => null)) as
      | T.AcumaticaApiResponse<R>
      | null;

    if (!json) {
      throw new AcumaticaError(
        "INTERNAL_ERROR",
        `platform-acumatica returned non-JSON response (status ${res.status})`,
        res.status
      );
    }

    if (!json.success) {
      throw new AcumaticaError(
        json.error.code as AcumaticaErrorCode,
        json.error.message,
        res.status
      );
    }

    return json.data;
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  /** GET /api/v1/health */
  getHealth(): Promise<T.HealthResponse> {
    // The health endpoint returns a raw object (no envelope). Call fetch directly.
    const url = `${this.opts.baseUrl}/api/v1/health`;
    return this.fetchImpl(url).then((res) => res.json() as Promise<T.HealthResponse>);
  }

  // ==========================================================================
  // Auth (Profile A — service role only)
  // ==========================================================================

  /** POST /api/v1/auth/token — cached-first access token fetch. */
  getValidToken(input: T.TokenRequest): Promise<T.AuthTokenResponse> {
    return this.call("/auth/token", { method: "POST", body: input });
  }

  /** POST /api/v1/auth/refresh — refresh (or re-issue) an access token. */
  refreshToken(input: T.TokenRequest): Promise<T.AuthTokenResponse> {
    return this.call("/auth/refresh", { method: "POST", body: input });
  }

  /** POST /api/v1/auth/service-account — bypass cache; force a fresh service-account login. */
  serviceAccountAuth(input: T.TokenRequest): Promise<T.AuthTokenResponse> {
    return this.call("/auth/service-account", { method: "POST", body: input });
  }

  // ==========================================================================
  // Credentials
  // ==========================================================================

  /** GET /api/v1/credentials — returns non-secret metadata, or { credentials: null }. (Profile A) */
  getCredentials(input: T.GetCredentialsQuery): Promise<T.GetCredentialsResponse> {
    return this.call("/credentials", {
      query: {
        organizationId: input.organizationId,
        environment: input.environment,
      },
    });
  }

  /** POST /api/v1/credentials — upsert credentials JSONB sub-object. (Profile B — requires userJwt) */
  upsertCredentials(
    input: T.UpsertCredentialsInput
  ): Promise<T.UpsertCredentialsResponse> {
    return this.call("/credentials", { method: "POST", body: input });
  }

  /** DELETE /api/v1/credentials — soft-delete by setting status = "inactive". (Profile B — requires userJwt) */
  deleteCredentials(
    input: T.DeleteCredentialsInput
  ): Promise<T.DeleteCredentialsResponse> {
    return this.call("/credentials", { method: "DELETE", body: input });
  }

  // ==========================================================================
  // Accounts / financial reads (Profile A)
  // ==========================================================================

  /** GET /api/v1/accounts — GL accounts, optionally filtered by accountClass + accountCDs. */
  getAccounts(input: T.AccountsQuery): Promise<T.AcumaticaAccount[]> {
    return this.call("/accounts", {
      query: {
        organizationId: input.organizationId,
        accountClass: input.accountClass,
        accountCDs: input.accountCDs?.join(","),
      },
    });
  }

  /** GET /api/v1/accounts/trial-balance */
  getTrialBalance(
    input: T.TrialBalanceQuery
  ): Promise<T.AcumaticaTrialBalance[]> {
    return this.call("/accounts/trial-balance", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/expense-accounts/lookup — search-as-you-type AP expense-account lookup. */
  lookupExpenseAccount(
    input: T.ExpenseAccountsLookupQuery
  ): Promise<T.AcumaticaExpenseAccountLookupResult> {
    return this.call("/expense-accounts/lookup", {
      query: {
        organizationId: input.organizationId,
        search: input.search,
      },
    });
  }

  // ==========================================================================
  // AP surface (Profile A)
  // ==========================================================================

  /** GET /api/v1/ap/accounts — AP-specific expense accounts for dropdowns. */
  getAPAccounts(input: T.APAccountsQuery): Promise<T.AcumaticaExpenseAccount[]> {
    return this.call("/ap/accounts", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/ap/adjustments — AP adjustments (checks/debit memos) for a batch. */
  getAPAdjustments(input: T.ApAdjustmentsQuery): Promise<T.AcumaticaAPAdjustment[]> {
    return this.call("/ap/adjustments", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/ap/open-bills */
  getOpenAPBills(input: T.OpenBillsQuery): Promise<T.AcumaticaAPBill[]> {
    return this.call("/ap/open-bills", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/ap/vendor — AP surface vendor lookup. */
  getAPVendor(input: T.APVendorQuery): Promise<T.AcumaticaVendorLookupResult> {
    return this.call("/ap/vendor", {
      query: {
        organizationId: input.organizationId,
        vendorId: input.vendorId,
        vendorName: input.vendorName,
        query: input.query,
        limit: input.limit,
      },
    });
  }

  /** POST /api/v1/ap/bills — create an AP bill from a parsed invoice. */
  createAPBill(input: T.CreateBillInput): Promise<T.CreateAcumaticaBillResult> {
    return this.call("/ap/bills", { method: "POST", body: input });
  }

  /** GET /api/v1/ar/open-invoices */
  getOpenARInvoices(input: T.OpenARInvoicesQuery): Promise<T.AcumaticaARInvoice[]> {
    return this.call("/ar/open-invoices", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/inventory/receipts */
  getInventoryReceipts(input: T.InReceiptsQuery): Promise<T.AcumaticaINReceipt[]> {
    return this.call("/inventory/receipts", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  // ==========================================================================
  // Vendors (Profile A)
  // ==========================================================================

  /** GET /api/v1/vendors/lookup — by id and/or name. */
  lookupVendor(input: T.VendorLookupQuery): Promise<T.AcumaticaVendorLookupResult> {
    return this.call("/vendors/lookup", {
      query: {
        organizationId: input.organizationId,
        vendorId: input.vendorId,
        vendorName: input.vendorName,
      },
    });
  }

  /** GET /api/v1/vendors/search — partial-name match. */
  searchVendors(input: T.VendorSearchQuery): Promise<T.AcumaticaVendorSearchResult> {
    return this.call("/vendors/search", {
      query: {
        organizationId: input.organizationId,
        query: input.query,
        limit: input.limit,
      },
    });
  }

  /** POST /api/v1/vendors — create a vendor in Acumatica. */
  createVendor(input: T.CreateVendorInput): Promise<T.CreateAcumaticaVendorResult> {
    return this.call("/vendors", { method: "POST", body: input });
  }

  // ==========================================================================
  // Recon (Profile A)
  // ==========================================================================

  /** GET /api/v1/recon/ap-bills */
  getAPBillsForRecon(input: T.ReconBatchQuery): Promise<unknown[]> {
    return this.call("/recon/ap-bills", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/recon/ap-payments */
  getAPPaymentsForRecon(input: T.ReconBatchQuery): Promise<unknown[]> {
    return this.call("/recon/ap-payments", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/recon/ar-invoices */
  getARInvoicesForRecon(input: T.ReconBatchQuery): Promise<unknown[]> {
    return this.call("/recon/ar-invoices", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/recon/ar-payments */
  getARPaymentsForRecon(input: T.ReconBatchQuery): Promise<unknown[]> {
    return this.call("/recon/ar-payments", {
      query: {
        organizationId: input.organizationId,
        batchNbr: input.batchNbr,
      },
    });
  }

  /** GET /api/v1/recon/cash-transactions */
  getCashTransactionsForRecon(
    input: T.TenantReadQuery
  ): Promise<unknown[]> {
    return this.call("/recon/cash-transactions", {
      query: { organizationId: input.organizationId },
    });
  }

  /** POST /api/v1/recon/bank-transaction-match — write matches back to an Acumatica BankTransaction. */
  updateBankTransactionMatch(
    input: T.BankTransactionMatchInput
  ): Promise<unknown> {
    return this.call("/recon/bank-transaction-match", {
      method: "POST",
      body: input,
    });
  }

  // ==========================================================================
  // Import scenarios (Profile A)
  // ==========================================================================

  /**
   * POST /api/v1/import-scenarios/:entityType/execute — fire-and-forget trigger.
   * Returns immediately after POSTing `ProcessImportScenarios/Process`.
   */
  executeImportScenario(
    entityType: T.ImportEntityType,
    input: T.ExecuteImportInput
  ): Promise<T.ExecuteImportResponse> {
    return this.call(`/import-scenarios/${entityType}/execute`, {
      method: "POST",
      body: input,
    });
  }

  /**
   * POST /api/v1/import-scenarios/:entityType/execute-with-verification —
   * blocking trigger + poll. May take up to `timeoutMs` (server caps at 5 minutes).
   */
  executeImportScenarioWithVerification(
    entityType: T.ImportEntityType,
    input: T.ExecuteWithVerificationInput
  ): Promise<T.ImportScenarioExecutionResult> {
    return this.call(`/import-scenarios/${entityType}/execute-with-verification`, {
      method: "POST",
      body: input,
    });
  }

  /** GET /api/v1/import-scenarios/:entityType/mappings — field mappings snapshot, or null. */
  getImportScenarioMappings(
    entityType: T.ImportEntityType,
    input: T.MappingsQuery
  ): Promise<T.ImportScenarioMappingSnapshot | null> {
    return this.call(`/import-scenarios/${entityType}/mappings`, {
      query: { organizationId: input.organizationId },
    });
  }

  // ==========================================================================
  // Substitution lists (Profile A)
  // ==========================================================================

  /** GET /api/v1/substitution-lists/:listName/state */
  getSubstitutionListState(
    listName: string,
    input: T.ListStateQuery
  ): Promise<T.SubstitutionListState> {
    return this.call(`/substitution-lists/${encodeURIComponent(listName)}/state`, {
      query: { organizationId: input.organizationId },
    });
  }

  /** POST /api/v1/substitution-lists/:listName/push */
  pushSubstitutionList(
    listName: string,
    input: T.ListPushInput
  ): Promise<unknown> {
    return this.call(`/substitution-lists/${encodeURIComponent(listName)}/push`, {
      method: "POST",
      body: { organizationId: input.organizationId, listName, items: input.items },
    });
  }

  /** POST /api/v1/substitution-lists/check-push — diff + push only when needed. */
  checkPushSubstitutionList(
    input: T.CheckPushSubstitutionListsInput
  ): Promise<T.CheckPushResponse> {
    return this.call(`/substitution-lists/check-push`, {
      method: "POST",
      body: input,
    });
  }

  /** GET /api/v1/prospect-mappings/:type — rows from public.prospectMapping. */
  getProspectMappings(
    type: string,
    input: T.TenantReadQuery
  ): Promise<T.ProspectMappingRow[]> {
    return this.call(`/prospect-mappings/${encodeURIComponent(type)}`, {
      query: { organizationId: input.organizationId },
    });
  }

  // ==========================================================================
  // Maintenance mode (Profile B — requires userJwt)
  // ==========================================================================

  /** POST /api/v1/maintenance-mode/enable */
  enableMaintenanceMode(input: T.EnableMaintenanceInput): Promise<unknown> {
    return this.call("/maintenance-mode/enable", { method: "POST", body: input });
  }

  /** POST /api/v1/maintenance-mode/disable */
  disableMaintenanceMode(input: T.DisableMaintenanceInput): Promise<unknown> {
    return this.call("/maintenance-mode/disable", { method: "POST", body: input });
  }

  // ==========================================================================
  // Migration mode (Profile B — requires userJwt)
  // ==========================================================================

  /** GET /api/v1/migration-mode/:type/id — read the AR/AP preference record id. */
  getMigrationModeId(
    type: T.MigrationModeType,
    input: T.MigrationModeIdQuery
  ): Promise<T.MigrationModeIdResponse> {
    return this.call(`/migration-mode/${type}/id`, {
      query: { organizationId: input.organizationId },
    });
  }

  /** POST /api/v1/migration-mode/:type/enable */
  enableMigrationMode(
    type: T.MigrationModeType,
    input: T.MigrationModeBody
  ): Promise<unknown> {
    return this.call(`/migration-mode/${type}/enable`, {
      method: "POST",
      body: input,
    });
  }

  /** POST /api/v1/migration-mode/:type/disable */
  disableMigrationMode(
    type: T.MigrationModeType,
    input: T.MigrationModeBody
  ): Promise<unknown> {
    return this.call(`/migration-mode/${type}/disable`, {
      method: "POST",
      body: input,
    });
  }

  // ==========================================================================
  // Tenant reads (Profile A — 14 endpoints + name + reference-lists)
  // ==========================================================================

  /** GET /api/v1/tenant/name */
  getTenantName(input: T.TenantReadQuery): Promise<string> {
    return this.call("/tenant/name", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/account-classes */
  getAccountClasses(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/account-classes", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/branches */
  getBranches(input: T.TenantReadQuery): Promise<T.AcumaticaBranch[]> {
    return this.call("/tenant/branches", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/chart-of-accounts */
  getChartOfAccounts(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/chart-of-accounts", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/credit-terms */
  getCreditTerms(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/credit-terms", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/customer-classes */
  getCustomerClasses(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/customer-classes", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/expense-accounts */
  getTenantExpenseAccounts(
    input: T.TenantReadQuery
  ): Promise<T.AcumaticaExpenseAccount[]> {
    return this.call("/tenant/expense-accounts", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/item-classes */
  getItemClasses(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/item-classes", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/ledgers */
  getLedgers(input: T.TenantReadQuery): Promise<T.AcumaticaLedger[]> {
    return this.call("/tenant/ledgers", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/payment-methods */
  getPaymentMethods(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/payment-methods", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/ship-via */
  getShipVia(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/ship-via", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/substitution-lists */
  getSubstitutionLists(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/substitution-lists", {
      query: { organizationId: input.organizationId },
    });
  }

  /** GET /api/v1/tenant/vendor-classes */
  getVendorClasses(input: T.TenantReadQuery): Promise<unknown[]> {
    return this.call("/tenant/vendor-classes", {
      query: { organizationId: input.organizationId },
    });
  }

  /**
   * GET /api/v1/tenant/reference-lists/:listName —
   * returns a flat `string[]` for credit-terms | payment-methods | ship-via.
   */
  getReferenceList(
    listName: T.ReferenceListName,
    input: T.TenantReadQuery
  ): Promise<string[]> {
    return this.call(`/tenant/reference-lists/${listName}`, {
      query: { organizationId: input.organizationId },
    });
  }

  // ==========================================================================
  // Tenant provisioning (stub endpoints — Profile A)
  // ==========================================================================

  /** POST /api/v1/tenant/create — thin stub acknowledging a tenant-create trigger. */
  createTenant(input: T.CreateTenantInput): Promise<T.CreateTenantResponse> {
    return this.call("/tenant/create", { method: "POST", body: input });
  }

  /** POST /api/v1/tenant/push-substitution-lists — snake_case legacy push. */
  pushTenantSubstitutionLists(
    input: T.PushSubstitutionListsInput
  ): Promise<unknown> {
    return this.call("/tenant/push-substitution-lists", {
      method: "POST",
      body: input,
    });
  }

  /**
   * POST /api/v1/tenant/apply-module-configuration — currently returns 501.
   * The orchestration stays in member-portal until MemberTenant grows a
   * generic feature-flag helper.
   */
  applyModuleConfiguration(
    input: T.ApplyModuleConfigurationInput
  ): Promise<unknown> {
    return this.call("/tenant/apply-module-configuration", {
      method: "POST",
      body: input,
    });
  }

  // ==========================================================================
  // Generic entity create (Profile A)
  // ==========================================================================

  /**
   * POST /api/v1/entities/:entityName — create an entity via the Acumatica
   * Default endpoint. `payload` is forwarded verbatim.
   */
  createEntity(entityName: string, input: T.CreateEntityBody): Promise<unknown> {
    return this.call(`/entities/${encodeURIComponent(entityName)}`, {
      method: "POST",
      body: input,
    });
  }
}
