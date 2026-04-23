import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseConfig, getSupabaseCookieOptions } from "@/lib/auth/config"

let browserClient: SupabaseClient | undefined

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient
  }

  const { publishableKey, url } = getSupabaseConfig()

  browserClient = createBrowserClient(url, publishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
  })

  return browserClient
}
