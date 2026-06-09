import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { tryOrgAuth } from "@/lib/services/app/auth/guards";
import {
  resolveOrganizationIdForUser,
  userHasOrganizationAccess,
  validateBearerUser,
} from "@/lib/services/app/auth/api-session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EtlSchemaClient = {
  from: (table: string) => ReturnType<ReturnType<typeof createServiceRoleSupabaseClient>["from"]>;
};

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const expectedHeader = `Bearer ${secret}`;
  if (authHeader.length !== expectedHeader.length) return false;

  const expectedBuffer = Buffer.from(expectedHeader, "utf8");
  const providedBuffer = Buffer.from(authHeader, "utf8");
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

async function listAcumaticaOrganizationIds(): Promise<string[]> {
  const supabase = createServiceRoleSupabaseClient();
  const etl = (supabase as unknown as { schema: (name: string) => EtlSchemaClient }).schema(
    "etl"
  );

  const { data: acuSystem, error: systemError } = await etl
    .from("systems")
    .select("id")
    .eq("name", "Acumatica")
    .is("disabled_at", null)
    .maybeSingle<{ id: string }>();

  if (systemError) {
    throw new Error(`Failed to resolve Acumatica system: ${systemError.message}`);
  }

  if (!acuSystem?.id) {
    return [];
  }

  const { data, error } = await etl
    .from("organization_systems")
    .select("organization_id")
    .eq("system_id", acuSystem.id)
    .is("disabled_at", null);

  if (error) {
    throw new Error(`Failed to list Acumatica organizations: ${error.message}`);
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const organizationId = (row as { organization_id?: string }).organization_id;
    if (organizationId && UUID_REGEX.test(organizationId)) {
      ids.add(organizationId);
    }
  }

  return [...ids];
}

async function resolveAuthenticatedOrganizationIds(
  request: NextRequest
): Promise<string[]> {
  const auth = await tryOrgAuth();
  if (auth?.organization.id) {
    return [auth.organization.id];
  }

  const { user, error } = await validateBearerUser(request);
  if (error || !user) {
    return [];
  }

  const organizationId = await resolveOrganizationIdForUser(user.id);
  return organizationId ? [organizationId] : [];
}

export type BankReconAuthMode = "cron" | "user" | "unauthorized";

export async function resolveBankReconOrganizationIdsForCron(
  request: NextRequest
): Promise<{
  mode: BankReconAuthMode;
  organizationIds: string[];
  error?: string;
}> {
  if (!isCronAuthorized(request)) {
    return {
      mode: "unauthorized",
      organizationIds: [],
      error: "Cron authorization required (Bearer CRON_SECRET).",
    };
  }

  const queryOrgId = request.nextUrl.searchParams.get("organizationId")?.trim();
  const organizationIds = queryOrgId
    ? [queryOrgId]
    : await listAcumaticaOrganizationIds();

  return { mode: "cron", organizationIds };
}

export async function resolveBankReconOrganizationIdsForUser(
  request: NextRequest
): Promise<{
  mode: BankReconAuthMode;
  organizationIds: string[];
  error?: string;
}> {
  const queryOrgId = request.nextUrl.searchParams.get("organizationId")?.trim();

  const organizationIds = await resolveAuthenticatedOrganizationIds(request);
  if (organizationIds.length === 0) {
    return {
      mode: "unauthorized",
      organizationIds: [],
      error: "Authentication required. Sign in or provide a valid Bearer token.",
    };
  }

  if (queryOrgId) {
    if (!UUID_REGEX.test(queryOrgId)) {
      return {
        mode: "unauthorized",
        organizationIds: [],
        error: "Invalid organization ID format",
      };
    }

    const auth = await tryOrgAuth();
    const userId = auth?.profile.id;
    if (!userId) {
      const bearer = await validateBearerUser(request);
      if (!bearer.user) {
        return {
          mode: "unauthorized",
          organizationIds: [],
          error: "Authentication required",
        };
      }
      const hasAccess = await userHasOrganizationAccess(bearer.user.id, queryOrgId);
      if (!hasAccess) {
        return {
          mode: "unauthorized",
          organizationIds: [],
          error: "Access denied to this organization",
        };
      }
    } else {
      const hasAccess = await userHasOrganizationAccess(userId, queryOrgId);
      if (!hasAccess) {
        return {
          mode: "unauthorized",
          organizationIds: [],
          error: "Access denied to this organization",
        };
      }
    }

    return { mode: "user", organizationIds: [queryOrgId] };
  }

  return { mode: "user", organizationIds };
}

/** @deprecated Use resolveBankReconOrganizationIdsForCron or ForUser */
export async function resolveBankReconOrganizationIds(
  request: NextRequest,
  options: { allowCron?: boolean } = {}
): Promise<{
  mode: BankReconAuthMode;
  organizationIds: string[];
  error?: string;
}> {
  if (options.allowCron) {
    return resolveBankReconOrganizationIdsForCron(request);
  }
  return resolveBankReconOrganizationIdsForUser(request);
}
