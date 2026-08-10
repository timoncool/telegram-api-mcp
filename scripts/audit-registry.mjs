#!/usr/bin/env node
/**
 * Diff src/methods (the MCP registry) against the local docs mirror.
 *
 *   npm run build && node scripts/audit-registry.mjs
 *
 * Exits non-zero when the registry drifts from the documented API, so CI catches
 * a new Bot API release instead of a user hitting "unknown parameter" at runtime.
 * Refresh the mirror first with `node scripts/refresh-docs.mjs`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const docs = JSON.parse(readFileSync(join(ROOT, "docs", "api-params.json"), "utf8"));
const version = readFileSync(join(ROOT, "docs", "api-version.txt"), "utf8").trim();
const { allMethods } = await import(new URL("../dist/methods/index.js", import.meta.url));

const implemented = new Map(allMethods.map((m) => [m.apiMethod, m]));
const problems = [];

for (const name of Object.keys(docs)) {
  if (!implemented.has(name)) problems.push(`MISSING METHOD  ${name}`);
}
for (const name of implemented.keys()) {
  if (!docs[name]) problems.push(`UNKNOWN METHOD  ${name} (not in Bot API ${version})`);
}

for (const [name, def] of implemented) {
  const spec = docs[name];
  if (!spec) continue;
  const official = spec.params.map((p) => p.name);
  const ours = def.params.map((p) => p.name);
  const missing = official.filter((p) => !ours.includes(p));
  const extra = ours.filter((p) => !official.includes(p));
  const wrongRequired = spec.params
    .filter((p) => {
      const our = def.params.find((x) => x.name === p.name);
      return our && our.required !== p.required;
    })
    .map((p) => `${p.name}(should be ${p.required ? "required" : "optional"})`);

  if (missing.length) problems.push(`${name}  missing params: ${missing.join(", ")}`);
  if (extra.length) problems.push(`${name}  params not in API: ${extra.join(", ")}`);
  if (wrongRequired.length) problems.push(`${name}  wrong required flag: ${wrongRequired.join(", ")}`);
}

console.log(`Bot API ${version} — ${Object.keys(docs).length} documented, ${implemented.size} implemented`);
if (problems.length === 0) {
  console.log("Registry matches the documented API.");
  process.exit(0);
}
console.log(`\n${problems.length} discrepancies:`);
for (const p of problems) console.log(`  ${p}`);
process.exit(1);
