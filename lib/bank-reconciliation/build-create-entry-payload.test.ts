import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acumaticaReferenceNbr,
  buildApBillPayload,
  extractCounterpartyFromGpt,
  resolveBankTransactionDrCr,
  resolveMatchedReferenceNbr,
} from "./build-create-entry-payload.ts";

describe("resolveBankTransactionDrCr", () => {
  it("accepts canonical drCr values", () => {
    assert.equal(resolveBankTransactionDrCr({ drCr: "Receipt" }), "Receipt");
    assert.equal(
      resolveBankTransactionDrCr({ drCr: "Disbursement" }),
      "Disbursement"
    );
  });

  it("falls back to DrCr when drCr is absent", () => {
    assert.equal(resolveBankTransactionDrCr({ DrCr: "Receipt" }), "Receipt");
  });

  it("rejects missing or unexpected drCr values", () => {
    assert.throws(
      () => resolveBankTransactionDrCr({}),
      /Cannot determine whether this bank transaction is a receipt or disbursement/
    );
    assert.throws(
      () => resolveBankTransactionDrCr({ drCr: "disbursement" }),
      /Cannot determine whether this bank transaction is a receipt or disbursement/
    );
  });
});

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

describe("resolveMatchedReferenceNbr", () => {
  it("prefers matched_candidate.reference_nbr over top-level field", () => {
    assert.equal(
      resolveMatchedReferenceNbr({
        matched_reference_nbr: "WRONG",
        matched_candidate: { reference_nbr: "000123" },
      }),
      "000123"
    );
  });

  it("falls back to matched_reference_nbr when candidate ref is empty", () => {
    assert.equal(
      resolveMatchedReferenceNbr({
        matched_reference_nbr: "000456",
        matched_candidate: { reference_nbr: "" },
      }),
      "000456"
    );
  });

  it("returns null when both are missing", () => {
    assert.equal(resolveMatchedReferenceNbr({ matched_candidate: {} }), null);
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
