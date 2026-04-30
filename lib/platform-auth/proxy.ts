import { NextRequest, NextResponse } from "next/server"
import {
  getPlatformAuthConfig,
  getPlatformAuthServiceToken,
} from "@/lib/auth/config"

type PlatformAuthMode = "service" | "serviceWithUser"

interface PlatformAuthProxyOptions {
  authMode?: PlatformAuthMode
}

function getUserAuthorizationHeader(
  request: NextRequest,
  authMode: PlatformAuthMode
): string | undefined {
  switch (authMode) {
    case "service":
      return undefined
    case "serviceWithUser":
      return request.headers.get("Authorization") ?? undefined
    default: {
      const exhaustiveCheck: never = authMode
      return exhaustiveCheck
    }
  }
}

export async function proxyPlatformAuthPost(
  request: NextRequest,
  routeName: string,
  options: PlatformAuthProxyOptions = {}
) {
  const authMode = options.authMode ?? "service"
  const { appId, url } = getPlatformAuthConfig()
  const body = await request.text()
  const userAuthorization = getUserAuthorizationHeader(request, authMode)
  const response = await fetch(`${url}/api/v1/auth/${routeName}`, {
    body: body || undefined,
    headers: {
      Authorization: `Bearer ${getPlatformAuthServiceToken()}`,
      "Content-Type": "application/json",
      ...(userAuthorization
        ? { "x-user-authorization": userAuthorization }
        : {}),
      "x-stellar-app": appId,
    },
    method: "POST",
  })

  const payload = await response.json().catch(() => {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "platform-auth returned a non-JSON response.",
      },
    }
  })

  return NextResponse.json(payload, { status: response.status })
}
