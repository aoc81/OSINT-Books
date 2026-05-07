import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { normalizeCatalogSource, renderCatalogReadme } from "./catalog-source-utils.mjs";

const targetRoot = path.resolve(process.argv[2] ?? process.cwd());
const catalogPath = path.join(targetRoot, "catalog", "catalog.json");
const readmePath = path.join(targetRoot, "README.md");

async function main() {
  const raw = await readFile(catalogPath, "utf8");
  const catalog = normalizeCatalogSource(JSON.parse(raw));
  await writeFile(readmePath, renderCatalogReadme(catalog), "utf8");
  console.log(`Rendered README from ${catalogPath} to ${readmePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
