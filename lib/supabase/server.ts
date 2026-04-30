import { createServerClient } from "@supabase/ssr"
import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseConfig, getSupabaseCookieOptions } from "@/lib/auth/config"

export type ServerAuthClaims = Record<string, unknown>

function readRequiredServerEnv(name: "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_URL") {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const { publishableKey, url } = getSupabaseConfig()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot write headers. The root proxy refreshes cookies.
        }
      },
    },
    cookieOptions: getSupabaseCookieOptions(),
  })
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  return createClient(
    readRequiredServerEnv("SUPABASE_URL"),
    readRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getServerClaims(): Promise<ServerAuthClaims | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    return null
  }

  return data.claims as ServerAuthClaims
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
