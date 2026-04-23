type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "PLATFORM_AUTH_URL"

type PublicEnvKey = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"

function readPublicEnv(key: PublicEnvKey): string | undefined {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL": {
      const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      return value ? value : undefined
    }
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY": {
      const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      return value ? value : undefined
    }
  }
}

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim()
  return value ? value : undefined
}

function readRequiredEnv(key: RequiredEnvKey): string {
  const value =
    key === "PLATFORM_AUTH_URL"
      ? readOptionalEnv(key)
      : readPublicEnv(key as PublicEnvKey)

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

export function getSupabaseConfig() {
  return {
    url: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  }
}

export function getSupabaseCookieOptions() {
  const cookieDomain = readOptionalEnv("SUPABASE_COOKIE_DOMAIN")

  return {
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
}

export function getPlatformAuthConfig() {
  return {
    appId: readOptionalEnv("PLATFORM_AUTH_APP_ID") ?? "financial-decision-maker",
    url: readRequiredEnv("PLATFORM_AUTH_URL"),
  }
}
