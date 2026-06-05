import { AcumaticaClient } from "./acumatica-client";

export interface CreateAcumaticaClientOptions {
  userJwt?: string;
  requestId?: string;
}

export function createAcumaticaClient(
  opts: CreateAcumaticaClientOptions = {}
): AcumaticaClient {
  const baseUrl = process.env.PLATFORM_ACUMATICA_URL;
  const serviceToken = process.env.PLATFORM_ACUMATICA_SERVICE_TOKEN;
  if (!baseUrl) throw new Error("PLATFORM_ACUMATICA_URL not configured");
  if (!serviceToken) {
    throw new Error("PLATFORM_ACUMATICA_SERVICE_TOKEN not configured");
  }
  const sourceApp =
    process.env.PLATFORM_ACUMATICA_SOURCE_APP?.trim() || "finance";
  return new AcumaticaClient({
    baseUrl,
    serviceToken,
    userJwt: opts.userJwt,
    sourceApp,
    requestId: opts.requestId,
  });
}

export type { AcumaticaClient } from "./acumatica-client";
export { AcumaticaError, type AcumaticaErrorCode } from "./errors";
