const globalKey = "__bankReconWorkflowRunOrgs" as const;

type GlobalWithRegistry = typeof globalThis & {
  [globalKey]?: Map<string, string>;
};

function getRegistry(): Map<string, string> {
  const g = globalThis as GlobalWithRegistry;
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey]!;
}

export function registerBankReconWorkflowRun(
  runId: string,
  organizationId: string
): void {
  getRegistry().set(runId, organizationId);
}

export function getBankReconWorkflowRunOrganization(
  runId: string
): string | undefined {
  return getRegistry().get(runId);
}
