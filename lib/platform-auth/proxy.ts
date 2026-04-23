import { NextRequest, NextResponse } from "next/server"
import { getPlatformAuthConfig } from "@/lib/auth/config"

export async function proxyPlatformAuthPost(
  request: NextRequest,
  routeName: string
) {
  const { appId, url } = getPlatformAuthConfig()
  const body = await request.text()
  const response = await fetch(`${url}/api/v1/auth/${routeName}`, {
    body: body || undefined,
    headers: {
      Authorization: request.headers.get("Authorization") ?? "",
      "Content-Type": "application/json",
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
