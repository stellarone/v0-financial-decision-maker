# Integrate Platform Acumatica

## Description
Setup guide for consuming the platform-acumatica service from a Next.js app. The service exposes 54 typed endpoints for authentication, credentials, tenant reads, financial entities, reconciliation, import scenarios, substitution lists, vendors, AP bills, maintenance mode, and migration mode — all backed by the shared Supabase `etl.organization_systems` row. This skill covers environment variables, the files you need to copy, instantiation of the typed `AcumaticaClient`, and the optional thin proxy-route pattern for exposing a subset of endpoints to browser code.

## Trigger
Use this skill when: "integrate platform-acumatica", "connect to acumatica service", "add acumatica to member-portal", "call the acumatica platform", "set up acumatica client".

## What platform-acumatica does

It is the single owner of all Acumatica REST/OData conversations across the platform. Consumers never talk to Acumatica directly; they call platform-acumatica over HTTP. The service validates JWTs, holds the Acumatica OAuth session in `etl.organization_systems.config.session`, refreshes tokens transparently, logs every upstream call, and returns typed envelopes.

## Environment Variables

Add to your consumer's `.env.local`:

```env
# Platform Acumatica Service
PLATFORM_ACUMATICA_URL=https://acumatica.stellarone.ai
PLATFORM_ACUMATICA_SERVICE_TOKEN=

# Shared Supabase (same project as everything else on stellarone.ai)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

`PLATFORM_ACUMATICA_URL` is the only new variable; the Supabase values are the usual cross-app shared set.

## Files to Copy

Copy these four files from `skills/app/platform-acumatica-api/client/` into your consumer's `lib/clients/` (or wherever you keep vendor-level HTTP clients). They are self-contained — no edits required.

1. `acumatica-client.ts` — typed `AcumaticaClient` class covering every endpoint.
2. `types.ts` — request/response types for every method.
3. `errors.ts` — `AcumaticaError` + `ACUMATICA_ERROR_CODES` enum.
4. `filter.ts` — pure OData filter helpers (`filterEq`, `filterIn`, `filterAnd`, `filterOr`, `filterContains`).

Verify the copy compiles in your tree:

```bash
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler \
  --strict --skipLibCheck --lib es2022,dom lib/clients/acumatica-*.ts lib/clients/types.ts lib/clients/errors.ts
```

## Usage

Instantiate one client per request (or per app if the service-role key is long-lived):

```typescript
import { AcumaticaClient } from "@/lib/clients/acumatica-client";

const client = new AcumaticaClient({
  baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
  serviceToken: process.env.PLATFORM_ACUMATICA_SERVICE_TOKEN!,
  sourceApp: "member-portal",
  userJwt: session?.access_token,
  requestId: crypto.randomUUID(),
});

const vendor = await client.lookupVendor({
  organizationId,
  vendorName: "ACME",
});
```

Every method returns the unwrapped `.data` payload. On errors the client throws `AcumaticaError` with `code` and `status` set.

## Proxy Route Template (optional — Next.js)

If a browser-side flow needs to call platform-acumatica, proxy through a Next.js Route Handler. This keeps the service-role key on the server and adds any app-level authorization you need. Each proxy is ~15 lines:

```typescript
// app/api/v1/acumatica/vendors/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AcumaticaClient } from "@/lib/clients/acumatica-client";
import { AcumaticaError } from "@/lib/clients/errors";
import { getServerUser } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const client = new AcumaticaClient({
    baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
    serviceToken: process.env.PLATFORM_ACUMATICA_SERVICE_TOKEN!,
    sourceApp: "member-portal",
    userJwt: (await user.getAccessToken()) ?? undefined,
  });

  try {
    const data = await client.lookupVendor({
      organizationId: searchParams.get("organizationId")!,
      vendorName: searchParams.get("vendorName") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof AcumaticaError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    throw err;
  }
}
```

## Auth Profiles Cheat-Sheet

- **Profile A (platform-acumatica service-token only)** — most endpoints. Consumer sends `Authorization: Bearer <platform-acumatica-service-token>` + `x-stellar-app`. Pass a server-side-resolved service token; never leak it to the browser.
- **Profile B (service-role + user JWT)** — credentials writes, maintenance-mode, migration-mode. Pass the authenticated user's JWT in `opts.userJwt`. The service audits Profile B calls with the JWT's `sub`.

See `skills/app/platform-acumatica-api/SKILL.md` for the full endpoint catalog with per-endpoint profile markers.

## Gotchas

- **`organizationId` is a UUID.** The service rejects anything else with `VALIDATION_ERROR`.
- **Stub endpoints.** `/tenant/create` and `/tenant/apply-module-configuration` are intentionally thin stubs in Phase 1 — their orchestration stays in member-portal. Don't try to replace member-portal's tenant-creation code by calling `createTenant()` alone.
- **Maintenance / migration mode require a user JWT.** Construct the client with `userJwt: session.access_token` before calling these.
- **`executeImportScenarioWithVerification` is blocking.** Budget up to `timeoutMs` (capped at 5 minutes server-side). For truly background runs, call `executeImportScenario` and poll `getImportScenarioMappings` yourself.
- **Contracts live in a separate skill.** If your app writes import-scenario transform rules or validation contracts, import them from `skills/app/acumatica-import-contract/` (see `acumatica-import-contract` skill) — those are the canonical copies.
