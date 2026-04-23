import { createServerClient } from "@supabase/ssr"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { getSupabaseConfig, getSupabaseCookieOptions } from "@/lib/auth/config"

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

export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getServerSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
