import { NextRequest } from "next/server"
import { proxyPlatformAuthPost } from "@/lib/platform-auth/proxy"

export async function POST(request: NextRequest) {
  return proxyPlatformAuthPost(request, "login")
}
