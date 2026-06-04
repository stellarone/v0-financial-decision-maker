import { describe, expect, it } from "vitest";
import {
  buildWebhookPayloadFromUnprocessedRows,
  mapUnprocessedRowToInserted,
} from "./map-unprocessed-bank-rows";

describe("mapUnprocessedRowToInserted", () => {
  const orgId = "0280f101-b1fb-42e5-b2a3-5c8ffc0dc752";

  it("maps a row for the member company and assigns the Stellar organization id", () => {
    const inserted = mapUnprocessedRowToInserted(
      {
        ID: 42,
        TranDate: "2026-06-01",
        TranDesc: "Coffee",
        CuryTranAmt: -4.5,
        DrCr: "Disbursement",
        ExtRefNbr: "abc",
        Processed: false,
        Matched: false,
        Hidden: false,
        CashAccount: "1000",
        AccountID: "PLATINUM",
      },
      orgId,
      "Platinum"
    );

    expect(inserted).toMatchObject({
      ID: 42,
      OrganizationID: orgId,
      Processed: false,
    });
  });

  it("drops rows for other Acumatica companies on shared template tenants", () => {
    expect(
      mapUnprocessedRowToInserted(
        {
          ID: 99,
          AccountID: "C000101",
          Processed: false,
          Matched: false,
          Hidden: false,
        },
        orgId,
        "Platinum"
      )
    ).toBeNull();
  });

  it("does not attribute other companies when OrganizationID is missing", () => {
    const payload = buildWebhookPayloadFromUnprocessedRows(
      [
        { ID: 1, AccountID: "PLATINUM", Processed: false, Matched: false, Hidden: false },
        { ID: 2, AccountID: "WOO", Processed: false, Matched: false, Hidden: false },
      ],
      orgId,
      "Platinum"
    );

    expect(payload.Inserted).toHaveLength(1);
    expect(payload.Inserted[0]?.ID).toBe(1);
    expect(payload.Query).toBe("Bank-UnprocessedTransactions");
  });
});
