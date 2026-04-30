import { redirect } from "next/navigation"
import {
  createServiceRoleSupabaseClient,
  getServerClaims,
  type ServerAuthClaims,
} from "@/lib/supabase/server"
import type { AuthContext } from "./types"

interface ProfileOrganizationData {
  is_employee?: boolean | null
  organization_id?: string | null
  organizations?: { domain?: string | null; secondary_domain?: string | null } | null
  role?: string | null
}

function readString(
  value: unknown,
  fallbackValue: string | null = null
): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallbackValue
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeOrganizationDomain(value: string | null): string | null {
  if (value && /^\d+-stellarone\.ai$/.test(value)) {
    return "stellarone.ai"
  }

  return value
}

function buildAuthContext(claims: ServerAuthClaims): AuthContext | null {
  const userId = readString(claims.sub)
  if (!userId) {
    return null
  }

  const appMetadata = readRecord(claims.app_metadata)
  const userMetadata = readRecord(claims.user_metadata)

  return {
    organization: {
      domain: readString(appMetadata.organization_domain),
      id: readString(appMetadata.org_id),
      isEmployee:
        typeof appMetadata.is_employee === "boolean"
          ? appMetadata.is_employee
          : null,
      role: readString(appMetadata.organization_role),
    },
    profile: {
      email: readString(claims.email),
      fullName:
        readString(userMetadata.full_name) ??
        readString(userMetadata.name) ??
        readString(appMetadata.full_name),
      id: userId,
    },
  }
}

async function fillOrganizationFromProfile(auth: AuthContext): Promise<AuthContext> {
  if (auth.organization.id) {
    return auth
  }

  const supabase = createServiceRoleSupabaseClient()
  const { data } = await supabase
    .from("profiles")
    .select("organization_id, is_employee, role, organizations(domain, secondary_domain)")
    .eq("id", auth.profile.id)
    .maybeSingle<ProfileOrganizationData>()

  if (!data?.organization_id) {
    return auth
  }

  const organizationDomain =
    readString(data.organizations?.domain) ??
    readString(data.organizations?.secondary_domain)

  return {
    ...auth,
    organization: {
      domain:
        auth.organization.domain ??
        normalizeOrganizationDomain(organizationDomain),
      id: data.organization_id,
      isEmployee:
        auth.organization.isEmployee ??
        (typeof data.is_employee === "boolean" ? data.is_employee : null),
      role: auth.organization.role ?? readString(data.role),
    },
  }
}

export async function tryOrgAuth(): Promise<AuthContext | null> {
  const claims = await getServerClaims()
  const auth = claims ? buildAuthContext(claims) : null
  return auth ? fillOrganizationFromProfile(auth) : null
}

export async function withAuth(): Promise<AuthContext> {
  const auth = await tryOrgAuth()

  if (!auth) {
    redirect("/sign-in")
  }

  return auth
}

export async function withOrgAuth(): Promise<AuthContext> {
  return withAuth()
}
