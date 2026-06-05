import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RECON_DECISION_STATUS,
  RECON_DECISION_STATUSES_BLOCKING_RERUN,
} from "./bank-reconciliation.ts";

describe("RECON_DECISION_STATUSES_BLOCKING_RERUN", () => {
  it("includes pending and completed but not failed", () => {
    assert.ok(
      RECON_DECISION_STATUSES_BLOCKING_RERUN.includes(
        RECON_DECISION_STATUS.PENDING
      )
    );
    assert.ok(
      RECON_DECISION_STATUSES_BLOCKING_RERUN.includes(
        RECON_DECISION_STATUS.COMPLETED
      )
    );
    assert.ok(
      !RECON_DECISION_STATUSES_BLOCKING_RERUN.includes(
        RECON_DECISION_STATUS.FAILED
      )
    );
  });
});
