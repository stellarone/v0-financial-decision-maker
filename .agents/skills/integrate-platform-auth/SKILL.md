# Integrate Platform Auth

## Description
Step-by-step guide for integrating authentication into a Next.js consumer app using the platform-auth service. Covers environment variables, files to copy, proxy routes, and middleware setup.

## Trigger
Use this skill when: "add auth", "integrate auth", "set up login", "connect to platform-auth", "add authentication to this app"

## Environment Variables

Add to `.env.local`:
```env
# Supabase (shared project -- same credentials across all *.stellarone.ai apps)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# Platform Auth Service
PLATFORM_AUTH_URL=https://auth.stellarone.ai
```

## Files to Copy (Session Management)

Copy these from the deployment-experience codebase. They handle local cookie/session management and stay in the consumer app:

1. `lib/supabase/client.ts` -- Browser-side Supabase client
2. `lib/supabase/server.ts` -- Server-side Supabase clients (`createServerSupabaseClient`, `getServerUser`, `getServerSession`)
3. `proxy.ts` -- Next.js middleware for session refresh + protected route redirects. Customize `protectedPrefixes` for your app's routes.
4. `lib/services/app/auth/guards.ts` -- Server component auth guards (`withAuth`, `withOrgAuth`, `tryOrgAuth`)
5. `lib/services/app/auth/types.ts` -- Auth context types (`AuthContext`, `AuthProfile`, `AuthOrganization`)
6. `lib/services/app/data/organizations.ts` -- Organization context helpers

## Proxy Routes

Create thin proxy routes that forward requests to platform-auth server-to-server. Each is ~5 lines:

### Template

```typescript
// app/api/v1/auth/[route-name]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const res = await fetch(
    `${process.env.PLATFORM_AUTH_URL}/api/v1/auth/<route-name>`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") ?? "",
      },
      body: await request.text(),
    }
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
```

### Routes to Create

Create a proxy route for each of these (replace `<route-name>` in the template):

- `app/api/v1/auth/login/route.ts`
- `app/api/v1/auth/logout/route.ts`
- `app/api/v1/auth/signup/route.ts`
- `app/api/v1/auth/verify-otp/route.ts`
- `app/api/v1/auth/reset-password/route.ts`
- `app/api/v1/auth/resend-otp/route.ts`
- `app/api/v1/auth/bootstrap-profile/route.ts`
- `app/api/v1/auth/invite-user/route.ts`
- `app/api/v1/auth/validate-signup/route.ts`
- `app/api/v1/auth/accept-terms/route.ts`

## Protected Layout Pattern

```typescript
// app/(protected)/layout.tsx
import { withOrgAuth } from "@/lib/services/app/auth/guards";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await withOrgAuth(); // Redirects to /auth if not authenticated
  return <>{children}</>;
}
```

## Cookie Domain (Cross-Subdomain SSO)

All apps on `*.stellarone.ai` share cookies. Configure the Supabase client cookie options:

```typescript
cookieOptions: {
  domain: ".stellarone.ai",
  path: "/",
  sameSite: "lax",
  secure: true,
}
```
