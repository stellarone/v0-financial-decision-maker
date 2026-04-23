# Platform Acumatica API Reference

## Description
Complete HTTP surface and client reference for the platform-acumatica service. Includes the typed `AcumaticaClient`, endpoint catalog grouped by resource, error codes, and canonical usage patterns. Use this when a consumer app (member-portal, platform-etl, evaluate, deployment-experience) needs to call any Acumatica operation without speaking OData directly.

## Trigger
Use this skill when: "call platform-acumatica", "acumatica API reference", "acumatica client", "create an AP bill", "pull substitution lists", "run an import scenario", "validate acumatica credentials".

## Configuration

Set these in the consumer's `.env.local`:

```env
PLATFORM_ACUMATICA_URL=https://acumatica.stellarone.ai
SUPABASE_SERVICE_ROLE_KEY=...
```

The client sends:
- `Authorization: Bearer <service-role-key>` — Profile A gate.
- `x-stellar-app: <source-app>` — required by all endpoints; used for audit + filtering.
- `x-stellar-user-jwt: <jwt>` — **Profile B only** (credentials writes, maintenance-mode, migration-mode). Pass a user JWT when available.
- `x-stellar-request-id: <uuid>` — optional correlation id for tracing across services.

## Client Usage

```typescript
import { AcumaticaClient, AcumaticaError } from "@/lib/clients/acumatica-client";

const client = new AcumaticaClient({
  baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  sourceApp: "member-portal",
  userJwt: currentUserSession?.access_token,
});

try {
  const vendor = await client.lookupVendor({
    organizationId,
    vendorName: "ACME",
  });
  if (vendor.found) console.log(vendor.vendorId);
} catch (err) {
  if (err instanceof AcumaticaError) {
    console.error(`[${err.code}] ${err.message}`);
  }
  throw err;
}
```

Every method returns the unwrapped `.data` from the service's `{ success, data }` envelope. On failure the client throws `AcumaticaError` with `code` (see [Error Codes](#error-codes)) and `status` (raw HTTP status).

## Endpoint Catalog

All paths are under `/api/v1`. "Profile A" = service-role only; "Profile B" = service-role + `x-stellar-user-jwt`.

### Auth

| Method | Path | Client method | Purpose | Profile |
|---|---|---|---|---|
| POST | `/auth/token` | `getValidToken` | Cached-first access token fetch | A |
| POST | `/auth/refresh` | `refreshToken` | Refresh (or re-issue) a token | A |
| POST | `/auth/service-account` | `serviceAccountAuth` | Force fresh service-account login, bypass cache | A |

### Credentials

| Method | Path | Client method | Purpose | Profile |
|---|---|---|---|---|
| GET | `/credentials` | `getCredentials` | Non-secret credential metadata | A |
| POST | `/credentials` | `upsertCredentials` | Upsert credentials JSONB sub-object | B |
| DELETE | `/credentials` | `deleteCredentials` | Soft-delete (status → inactive) | B |

### Tenant reads (simple `organizationId` query)

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/tenant/name` | `getTenantName` | A |
| GET | `/tenant/account-classes` | `getAccountClasses` | A |
| GET | `/tenant/branches` | `getBranches` | A |
| GET | `/tenant/chart-of-accounts` | `getChartOfAccounts` | A |
| GET | `/tenant/credit-terms` | `getCreditTerms` | A |
| GET | `/tenant/customer-classes` | `getCustomerClasses` | A |
| GET | `/tenant/expense-accounts` | `getTenantExpenseAccounts` | A |
| GET | `/tenant/item-classes` | `getItemClasses` | A |
| GET | `/tenant/ledgers` | `getLedgers` | A |
| GET | `/tenant/payment-methods` | `getPaymentMethods` | A |
| GET | `/tenant/ship-via` | `getShipVia` | A |
| GET | `/tenant/substitution-lists` | `getSubstitutionLists` | A |
| GET | `/tenant/vendor-classes` | `getVendorClasses` | A |
| GET | `/tenant/reference-lists/:listName` | `getReferenceList` | A |

### Accounts & financial entity reads

| Method | Path | Client method | Purpose | Profile |
|---|---|---|---|---|
| GET | `/accounts` | `getAccounts` | GL accounts with optional class + AccountCD filter | A |
| GET | `/accounts/trial-balance` | `getTrialBalance` | Trial balance rows | A |
| GET | `/expense-accounts/lookup` | `lookupExpenseAccount` | Search-as-you-type AP expense-account lookup | A |

### AP surface

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/ap/accounts` | `getAPAccounts` | A |
| GET | `/ap/adjustments` | `getAPAdjustments` | A |
| GET | `/ap/open-bills` | `getOpenAPBills` | A |
| GET | `/ap/vendor` | `getAPVendor` | A |
| POST | `/ap/bills` | `createAPBill` | A |

### AR surface

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/ar/open-invoices` | `getOpenARInvoices` | A |

### Inventory

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/inventory/receipts` | `getInventoryReceipts` | A |

### Vendors

| Method | Path | Client method | Purpose | Profile |
|---|---|---|---|---|
| GET | `/vendors/lookup` | `lookupVendor` | Single-vendor lookup by id and/or name | A |
| GET | `/vendors/search` | `searchVendors` | Partial-name search | A |
| POST | `/vendors` | `createVendor` | Create a vendor | A |

### Reconciliation

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/recon/ap-bills` | `getAPBillsForRecon` | A |
| GET | `/recon/ap-payments` | `getAPPaymentsForRecon` | A |
| GET | `/recon/ar-invoices` | `getARInvoicesForRecon` | A |
| GET | `/recon/ar-payments` | `getARPaymentsForRecon` | A |
| GET | `/recon/cash-transactions` | `getCashTransactionsForRecon` | A |
| POST | `/recon/bank-transaction-match` | `updateBankTransactionMatch` | A |

### Import scenarios

| Method | Path | Client method | Profile |
|---|---|---|---|
| POST | `/import-scenarios/:entityType/execute` | `executeImportScenario` | A |
| POST | `/import-scenarios/:entityType/execute-with-verification` | `executeImportScenarioWithVerification` | A |
| GET | `/import-scenarios/:entityType/mappings` | `getImportScenarioMappings` | A |

`entityType` must be one of the union in `client/types.ts` (`ChartOfAccounts`, `Customers`, `Vendors`, …).

### Substitution lists

| Method | Path | Client method | Profile |
|---|---|---|---|
| GET | `/substitution-lists/:listName/state` | `getSubstitutionListState` | A |
| POST | `/substitution-lists/:listName/push` | `pushSubstitutionList` | A |
| POST | `/substitution-lists/check-push` | `checkPushSubstitutionList` | A |
| GET | `/prospect-mappings/:type` | `getProspectMappings` | A |

### Maintenance & migration mode

| Method | Path | Client method | Profile |
|---|---|---|---|
| POST | `/maintenance-mode/enable` | `enableMaintenanceMode` | B |
| POST | `/maintenance-mode/disable` | `disableMaintenanceMode` | B |
| GET | `/migration-mode/:type/id` | `getMigrationModeId` | B |
| POST | `/migration-mode/:type/enable` | `enableMigrationMode` | B |
| POST | `/migration-mode/:type/disable` | `disableMigrationMode` | B |

`:type` must be `AR` or `AP`.

### Tenant provisioning (stubs — real work stays member-portal-side in Phase 1)

| Method | Path | Client method | Notes | Profile |
|---|---|---|---|---|
| POST | `/tenant/create` | `createTenant` | Acknowledgement stub | A |
| POST | `/tenant/push-substitution-lists` | `pushTenantSubstitutionLists` | snake_case legacy shape | A |
| POST | `/tenant/apply-module-configuration` | `applyModuleConfiguration` | Currently returns 501 | A |

### Generic entity create

| Method | Path | Client method | Profile |
|---|---|---|---|
| POST | `/entities/:entityName` | `createEntity` | A |

### Health

| Method | Path | Client method | Auth |
|---|---|---|---|
| GET | `/health` | `getHealth` | None |

## Error Codes

All non-2xx responses follow:

```json
{ "success": false, "error": { "code": "...", "message": "...", "fields": { ... } } }
```

`fields` only appears for `VALIDATION_ERROR` responses (one entry per Zod issue).

| Code | When |
|---|---|
| `AUTH_FAILED` | Missing/invalid service-role, user JWT, or Acumatica OAuth failure |
| `ORG_NOT_FOUND` | `organizationId` has no etl.organization_systems row |
| `CREDENTIALS_MISSING` / `CREDENTIALS_INVALID` | `config.credentials` is missing or unusable |
| `ACUMATICA_UNAVAILABLE` | Upstream Acumatica returned 5xx or the network call failed |
| `ACUMATICA_CREATE_FAILED` | Create call (vendor, bill, entity) failed upstream |
| `ACUMATICA_TIMEOUT` | Import-scenario verification did not complete within the supplied `timeoutMs` |
| `IMPORT_SCENARIO_NOT_FOUND` | Unknown `:entityType` for import scenarios |
| `IMPORT_SCENARIO_FAILED` | Trigger or verification run failed upstream |
| `MIGRATION_MODE_CONFLICT` / `MAINTENANCE_MODE_CONFLICT` | Mode-state conflict detected |
| `NOT_IMPLEMENTED` | Stub route that is not yet backed by real orchestration |
| `VALIDATION_ERROR` | Zod rejected the request; see `fields` |
| `NOT_FOUND` | Record does not exist (e.g. DELETE on an org with no row) |
| `INTERNAL_ERROR` | Unclassified server-side error |

## Filter Helpers

For endpoints that ultimately forward into OData (currently the accounts and vendor endpoints use server-side logic), the `filter.ts` helpers can be used client-side when you need to pass query strings through to lower-level calls:

```typescript
import { filterEq, filterIn, filterAnd } from "@/lib/clients/acumatica-filter";

const f = filterAnd(
  filterEq("AccountClass", "ASSET"),
  filterIn("AccountCD", ["1000", "1010", "1020"])
);
// → "AccountClass eq 'ASSET' and (AccountCD eq '1000' or AccountCD eq '1010' or AccountCD eq '1020')"
```

Most callers won't need these — the client exposes typed method arguments (e.g. `getAccounts({ accountClass, accountCDs })`). The helpers are here because platform-acumatica itself uses them internally and consumers occasionally compose custom filters when calling `createEntity` or reading raw entity collections.

## Typecheck standalone

The `client/` directory is intentionally self-contained (no imports from the rest of platform-acumatica). To verify a local copy typechecks cleanly in your consumer repo:

```bash
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler \
  --strict --skipLibCheck --lib es2022,dom \
  lib/clients/acumatica-client.ts lib/clients/types.ts \
  lib/clients/errors.ts lib/clients/acumatica-filter.ts
```

## Examples

See [`examples/`](./examples) for three common patterns:
- `lookup-vendor.ts` — AP-automation vendor lookup before a create.
- `execute-import-scenario.ts` — fire + verify an import scenario.
- `refresh-session.ts` — cached-first token fetch with correlation id.
