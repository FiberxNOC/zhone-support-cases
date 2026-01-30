#!/usr/bin/env node
/**
 * Genera REPORT.md, index.html y cases/*.html desde data/cases.json.
 * Ejecutar después de npm run sync o cuando ya exista data/cases.json.
 */
import { readFile, writeFile, mkdir, readdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  sortCases,
  getCaseFilename,
  buildReadme,
  buildCaseDetailHtml,
  buildIndexHtml,
} from "./report-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "cases.json");
const CASES_DIR = join(ROOT, "cases");

async function main() {
  let raw;
  try {
    raw = await readFile(DATA_FILE, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("No existe data/cases.json. Ejecuta primero: npm run sync");
      process.exit(1);
    }
    throw err;
  }

  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("data/cases.json está vacío o no es un array. Ejecuta: npm run sync");
    process.exit(1);
  }

  const sorted = sortCases(cases);
  await mkdir(CASES_DIR, { recursive: true });

  // Nombres por Case Number (ej. 562894.html); si no hay o hay duplicado → case-01.html, case-02.html
  const used = new Set();
  const filenames = sorted.map((c, i) => getCaseFilename(c, i, used));
  const currentFiles = new Set(filenames);

  try {
    const existing = await readdir(CASES_DIR);
    for (const name of existing) {
      if (name.endsWith(".html") && !currentFiles.has(name)) {
        await unlink(join(CASES_DIR, name));
        console.log("  (eliminado obsoleto)", name);
      }
    }
  } catch (_) {}

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    await writeFile(join(CASES_DIR, filenames[i]), buildCaseDetailHtml(c, i + 1), "utf8");
    console.log("  ", filenames[i]);
  }

  await writeFile(join(ROOT, "REPORT.md"), buildReadme(sorted, filenames), "utf8");
  await writeFile(join(ROOT, "index.html"), buildIndexHtml(sorted, filenames), "utf8");
  console.log("REPORT.md e index.html actualizados.");
  console.log(`\nListo: ${sorted.length} casos. Abre index.html para ver el reporte.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
