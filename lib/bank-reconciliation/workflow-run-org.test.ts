import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  assertBankReconWorkflowStreamSigningReady,
  createBankReconWorkflowStreamToken,
  verifyBankReconWorkflowStreamToken,
} from "./workflow-run-org.ts";

const ENV_KEYS = [
  "WORKFLOW_STREAM_SECRET",
  "CRON_SECRET",
  "SUPABASE_JWT_SECRET",
] as const;

function clearStreamSigningEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("workflow-run-org stream signing", () => {
  afterEach(() => {
    clearStreamSigningEnv();
  });

  it("uses SUPABASE_JWT_SECRET when CRON_SECRET is unset", () => {
    process.env.SUPABASE_JWT_SECRET = "jwt-only-secret";

    assertBankReconWorkflowStreamSigningReady();

    const token = createBankReconWorkflowStreamToken("run-1", "org-1");
    assert.equal(
      verifyBankReconWorkflowStreamToken("run-1", "org-1", token),
      true
    );
    assert.equal(
      verifyBankReconWorkflowStreamToken("run-1", "org-2", token),
      false
    );
  });

  it("prefers WORKFLOW_STREAM_SECRET over CRON_SECRET", () => {
    process.env.WORKFLOW_STREAM_SECRET = "dedicated-stream-secret";
    process.env.CRON_SECRET = "cron-secret";

    const token = createBankReconWorkflowStreamToken("run-2", "org-2");
    process.env.WORKFLOW_STREAM_SECRET = "other-secret";
    assert.equal(
      verifyBankReconWorkflowStreamToken("run-2", "org-2", token),
      false
    );
  });

  it("throws when no signing secret is configured", () => {
    assert.throws(
      () => assertBankReconWorkflowStreamSigningReady(),
      /stream signing secret is required/
    );
  });
});
