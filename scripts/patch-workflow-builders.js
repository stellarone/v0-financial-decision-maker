import { existsSync } from "node:fs";
import { readFile, writeFile, realpath } from "node:fs/promises";
import { join, sep } from "node:path";

const packageRoot = join(
  process.cwd(),
  "node_modules",
  "@workflow",
  "builders"
);
const targetRelative = join("dist", "base-builder.js");
const targetPath = join(packageRoot, targetRelative);

function isPathInsideRoot(rootReal, targetReal) {
  if (rootReal === targetReal) {
    return true;
  }
  const prefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
  return targetReal.startsWith(prefix);
}

async function resolveContainedTargetPath() {
  if (!existsSync(packageRoot) || !existsSync(targetPath)) {
    return null;
  }

  const rootReal = await realpath(packageRoot);
  const targetReal = await realpath(targetPath);

  if (!isPathInsideRoot(rootReal, targetReal)) {
    console.error(
      `[workflow-patch] Refusing to patch ${targetPath}: resolves outside ${packageRoot}.`
    );
    process.exit(1);
  }

  return targetReal;
}

const resolvedTargetPath = await resolveContainedTargetPath();
if (!resolvedTargetPath) {
  console.log(`[workflow-patch] Skipping: ${targetPath} not found.`);
  process.exit(0);
}

const content = await readFile(resolvedTargetPath, "utf8");

if (content.includes("renameWithRetry")) {
  console.log("[workflow-patch] Already applied.");
  process.exit(0);
}

const helperBlock = [
  "const isWindows = process.platform === 'win32';",
  "const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));",
  "const renameWithRetry = async (from, to, attempts = 8) => {",
  "  if (!isWindows) {",
  "    await rename(from, to);",
  "    return;",
  "  }",
  "  let lastError;",
  "  for (let attempt = 0; attempt < attempts; attempt += 1) {",
  "    try {",
  "      await rename(from, to);",
  "      return;",
  "    } catch (error) {",
  "      lastError = error;",
  "      const code = error && typeof error === 'object' ? error.code : undefined;",
  "      if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {",
  "        await delay(25 * (attempt + 1));",
  "        continue;",
  "      }",
  "      throw error;",
  "    }",
  "  }",
  "  throw lastError;",
  "};",
  ""
].join("\n");

const marker = "const EMIT_SOURCEMAPS_FOR_DEBUGGING = process.env.WORKFLOW_EMIT_SOURCEMAPS_FOR_DEBUGGING === '1';";
if (!content.includes(marker)) {
  console.log("[workflow-patch] Marker not found. Patch skipped.");
  process.exit(0);
}

const renameTarget = "await rename(tempPath, outfile);";
if (!content.includes(renameTarget)) {
  console.log("[workflow-patch] Rename target not found. Patch skipped.");
  process.exit(0);
}

const nextContent = content
  .replace(marker, `${marker}\n${helperBlock}`)
  .replace(renameTarget, "await renameWithRetry(tempPath, outfile);");

await writeFile(resolvedTargetPath, nextContent, "utf8");
console.log("[workflow-patch] Applied.");
