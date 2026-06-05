import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWorkflowRunId } from "./workflow-run-id.ts";

const returnValue = Promise.resolve(null);

describe("resolveWorkflowRunId", () => {
  it("prefers the WDK runId", () => {
    assert.equal(
      resolveWorkflowRunId({ runId: "run-real", id: "legacy-id", returnValue }),
      "run-real"
    );
  });

  it("falls back to id for compatibility", () => {
    assert.equal(resolveWorkflowRunId({ id: "legacy-id", returnValue }), "legacy-id");
  });

  it("throws instead of creating a synthetic id", () => {
    assert.throws(
      () => resolveWorkflowRunId({ returnValue }),
      /Workflow start did not return a run id/
    );
  });
});
