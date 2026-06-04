import type { BankReconciliationInput } from "@/data/types/bank-reconciliation";
import { createAcumaticaClient } from "@/lib/clients/acumatica";
import { buildWebhookPayloadFromUnprocessedRows } from "@/lib/bank-reconciliation/map-unprocessed-bank-rows";

export interface PreparedBankReconciliationRun {
  input: BankReconciliationInput;
  transactionCount: number;
}

export async function prepareBankReconciliationRun(
  organizationId: string
): Promise<PreparedBankReconciliationRun | null> {
  const client = createAcumaticaClient();
  const rows = await client.getUnprocessedBankTransactions({ organizationId });
  const { credentials } = await client.getCredentials({ organizationId });
  const acumaticaCompanyId = credentials?.tenantName?.trim();

  if (!acumaticaCompanyId) {
    throw new Error(
      `Acumatica tenant name is not configured for organization ${organizationId}`
    );
  }

  const webhookPayload = buildWebhookPayloadFromUnprocessedRows(
    rows,
    organizationId,
    acumaticaCompanyId
  );

  if (webhookPayload.Inserted.length === 0) {
    return null;
  }

  return {
    transactionCount: webhookPayload.Inserted.length,
    input: {
      organizationId,
      webhookPayload,
    },
  };
}
