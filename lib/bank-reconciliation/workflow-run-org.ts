import { createHmac, timingSafeEqual } from "crypto";

/** HMAC secret for run stream tokens (interactive UI). Not the cron Bearer token. */
function getStreamSigningSecret(): string {
  const secret =
    process.env.WORKFLOW_STREAM_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "A stream signing secret is required (WORKFLOW_STREAM_SECRET, CRON_SECRET, or SUPABASE_JWT_SECRET)"
    );
  }
  return secret;
}

/** Fail fast before starting a workflow when stream auth cannot be issued. */
export function assertBankReconWorkflowStreamSigningReady(): void {
  getStreamSigningSecret();
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
