/**
 * Example: fire + verify an Acumatica import scenario.
 *
 * Use `executeImportScenarioWithVerification` when you need to block on
 * completion. For truly background runs, call `executeImportScenario` (which
 * returns right after the trigger POST) and poll `getImportScenarioMappings`
 * or your own observability channel separately.
 */

import { AcumaticaClient } from "../client/acumatica-client";
import { AcumaticaError } from "../client/errors";
import type { ImportEntityType } from "../client/types";

async function main() {
  const client = new AcumaticaClient({
    baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
    serviceToken: process.env.PLATFORM_ACUMATICA_SERVICE_TOKEN!,
    sourceApp: "platform-etl",
  });

  const organizationId = "7c3d9b34-1234-5678-9012-abcdef123456";
  const entityType: ImportEntityType = "Customers";

  try {
    const result = await client.executeImportScenarioWithVerification(entityType, {
      organizationId,
      timeoutMs: 90_000,
      pollIntervalMs: 3_000,
    });

    console.log(
      `Scenario ${result.scenarioName} verified=${result.verified} ` +
        `freshRun=${result.freshRunDetected}`
    );
    if (result.after) {
      console.log(
        `  status=${result.after.status} records=${result.after.numberOfRecords}`
      );
    }
  } catch (err) {
    if (err instanceof AcumaticaError && err.code === "ACUMATICA_TIMEOUT") {
      console.warn("Scenario did not complete within the configured timeout.");
      return;
    }
    throw err;
  }
}

void main();
