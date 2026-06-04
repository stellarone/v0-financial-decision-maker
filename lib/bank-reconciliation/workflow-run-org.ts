import { createHmac, timingSafeEqual } from "crypto";

function getStreamSigningSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("CRON_SECRET is required to authorize workflow streams");
  }
  return secret;
}

export function createBankReconWorkflowStreamToken(
  runId: string,
  organizationId: string
): string {
  return createHmac("sha256", getStreamSigningSecret())
    .update(`${runId}:${organizationId}`)
    .digest("base64url");
}

export function verifyBankReconWorkflowStreamToken(
  runId: string,
  organizationId: string,
  token: string
): boolean {
  const expected = createBankReconWorkflowStreamToken(runId, organizationId);
  if (expected.length !== token.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
