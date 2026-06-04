import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acumaticaReferenceNbr,
  buildApBillPayload,
  extractCounterpartyFromGpt,
} from "./build-create-entry-payload.ts";

describe("extractCounterpartyFromGpt", () => {
  it("reads vendor and customer from matched_candidate", () => {
    assert.deepEqual(
      extractCounterpartyFromGpt({
        matched_candidate: { vendor: "MCDONALDS", customer: "UNITEDAIR" },
      }),
      { vendor: "MCDONALDS", customer: "UNITEDAIR" }
    );
  });
});

describe("buildApBillPayload", () => {
  it("includes vendor, terms, due date, and expense account line", () => {
    const payload = buildApBillPayload({
      vendorId: "MCDONALDS",
      tranDate: "2025-12-12",
      description: "McDonald's",
      amount: -12,
      expenseAccount: "5000",
    });

    assert.deepEqual(payload.Vendor, { value: "MCDONALDS" });
    assert.deepEqual(payload.Terms, { value: "NET30" });
    assert.equal(payload.DueDate?.value, "2026-01-11");
    assert.deepEqual(payload.Details[0], {
      Description: { value: "McDonald's" },
      Qty: { value: 1 },
      UnitCost: { value: 12 },
      Amount: { value: 12 },
      Account: { value: "5000" },
    });
  });
});

describe("acumaticaReferenceNbr", () => {
  it("unwraps Acumatica envelope", () => {
    assert.equal(
      acumaticaReferenceNbr({ ReferenceNbr: { value: "000006" } }),
      "000006"
    );
  });
});
