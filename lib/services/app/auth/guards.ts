import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { getServerUser } from "@/lib/supabase/server"
import type { AuthContext } from "./types"

function readString(
  value: unknown,
  fallbackValue: string | null = null
): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallbackValue
}

function buildAuthContext(user: User): AuthContext {
  const appMetadata = user.app_metadata
  const userMetadata = user.user_metadata

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
      email: user.email ?? null,
      fullName:
        readString(userMetadata.full_name) ??
        readString(userMetadata.name) ??
        readString(appMetadata.full_name),
      id: user.id,
    },
    user,
  }
}

export async function tryOrgAuth(): Promise<AuthContext | null> {
  const user = await getServerUser()
  return user ? buildAuthContext(user) : null
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
