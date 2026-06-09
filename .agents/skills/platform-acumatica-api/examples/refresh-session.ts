/**
 * Example: ensure we have a valid Acumatica token before a batch run.
 *
 * `getValidToken` is cached-first: it returns the current session if still
 * valid, otherwise refreshes (or re-authenticates) transparently. Use
 * `refreshToken` when you know the upstream session is stale; use
 * `serviceAccountAuth` when you explicitly need a fresh service-account
 * login that bypasses the cache.
 */

import { AcumaticaClient } from "../client/acumatica-client";
import { AcumaticaError } from "../client/errors";

async function main() {
  const client = new AcumaticaClient({
    baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
    serviceToken: process.env.PLATFORM_ACUMATICA_SERVICE_TOKEN!,
    sourceApp: "platform-etl",
    requestId: `batch-${crypto.randomUUID()}`,
  });

  const organizationId = "7c3d9b34-1234-5678-9012-abcdef123456";

  try {
    const { accessToken, expiresAt } = await client.getValidToken({
      organizationId,
    });
    console.log(
      `Token ready (expires ${expiresAt}): ${accessToken.slice(0, 12)}…`
    );
  } catch (err) {
    if (err instanceof AcumaticaError && err.code === "AUTH_FAILED") {
      console.error("Authentication failed — check service-account credentials.");
      process.exit(1);
    }
    throw err;
  }
}

void main();
