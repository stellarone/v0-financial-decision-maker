/**
 * Example: vendor lookup.
 *
 * A typical AP-automation path in member-portal looks up a vendor by name
 * before deciding whether to create one. `lookupVendor` returns
 * `{ found, vendorId, vendorName, terms }`.
 */

import { AcumaticaClient } from "../client/acumatica-client";
import { AcumaticaError } from "../client/errors";

async function main() {
  const client = new AcumaticaClient({
    baseUrl: process.env.PLATFORM_ACUMATICA_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    sourceApp: "member-portal",
  });

  try {
    const result = await client.lookupVendor({
      organizationId: "7c3d9b34-1234-5678-9012-abcdef123456",
      vendorName: "ACME Corp",
    });

    if (result.found) {
      console.log(`Vendor: ${result.vendorId} (${result.vendorName})`);
      if (result.terms) console.log(`  Terms: ${result.terms}`);
    } else {
      console.log("Vendor not found.");
    }
  } catch (err) {
    if (err instanceof AcumaticaError) {
      console.error(`[${err.code}] ${err.message} (HTTP ${err.status})`);
      return;
    }
    throw err;
  }
}

void main();
