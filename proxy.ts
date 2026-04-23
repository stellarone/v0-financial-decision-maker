import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseConfig, getSupabaseCookieOptions } from "@/lib/auth/config"

const AUTH_ROUTES = ["/sign-in"]
const PUBLIC_ROUTE_PREFIXES = ["/api/v1/auth/"]

function isPublicPath(pathname: string) {
  return (
    AUTH_ROUTES.includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function resolveRedirectTarget(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/cash-calendar"
  }

  return value
}

function copyResponseState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })

  source.headers.forEach((value, key) => {
    target.headers.set(key, value)
  })
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { publishableKey, url } = getSupabaseConfig()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        supabaseResponse = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, options, value }) => {
          supabaseResponse.cookies.set(name, value, options)
        })

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
    cookieOptions: getSupabaseCookieOptions(),
  })

  const { data: claimsData } = await supabase.auth.getClaims()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = isPublicPath(pathname)
  const isAuthenticated = Boolean(claimsData?.claims.sub)

  if (!isAuthenticated && !isPublicRoute) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = "/sign-in"
    signInUrl.searchParams.set(
      "redirectTo",
      `${pathname}${request.nextUrl.search}`
    )

    const redirectResponse = NextResponse.redirect(signInUrl)
    copyResponseState(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = resolveRedirectTarget(
      request.nextUrl.searchParams.get("redirectTo")
    )
    redirectUrl.search = ""

    const redirectResponse = NextResponse.redirect(redirectUrl)
    copyResponseState(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
