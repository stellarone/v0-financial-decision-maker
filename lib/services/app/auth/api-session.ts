import type { NextRequest } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export async function validateBearerUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createServiceRoleSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error?.message || "Invalid or expired token" };
  }

  return { user, error: null };
}

export async function resolveOrganizationIdForUser(
  userId: string
): Promise<string | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle<{ organization_id: string | null }>();

  return profile?.organization_id ?? null;
}

export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_employee")
    .eq("id", userId)
    .maybeSingle<{ organization_id: string | null; is_employee: boolean | null }>();

  if (!profile) return false;
  if (profile.organization_id === organizationId) return true;
  return profile.is_employee === true;
}
