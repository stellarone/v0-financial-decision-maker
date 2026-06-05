import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RECON_DECISION_STATUS } from "../../data/constants/bank-reconciliation.ts";
import { RECON_DECISION_COMPLETION_ROLLBACK_UPDATES } from "./complete-bank-transaction-reconciliation.ts";

describe("RECON_DECISION_COMPLETION_ROLLBACK_UPDATES", () => {
  it("resets status and clears completion metadata", () => {
    assert.equal(
      RECON_DECISION_COMPLETION_ROLLBACK_UPDATES.status,
      RECON_DECISION_STATUS.PENDING
    );
    assert.equal(
      RECON_DECISION_COMPLETION_ROLLBACK_UPDATES.final_doc_type,
      null
    );
    assert.equal(
      RECON_DECISION_COMPLETION_ROLLBACK_UPDATES.final_ref_nbr,
      null
    );
    assert.equal(RECON_DECISION_COMPLETION_ROLLBACK_UPDATES.reviewed_by, null);
    assert.equal(RECON_DECISION_COMPLETION_ROLLBACK_UPDATES.reviewed_at, null);
  });
});
