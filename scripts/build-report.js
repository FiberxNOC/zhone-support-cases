#!/usr/bin/env node
/**
 * Genera REPORT.md, index.html y cases/*.html desde data/cases.json (español).
 * Si existe data/cases-en.json, genera también REPORT-en.md, index-en.html y cases-en/*.html (inglés).
 * Omite el build si los datos no han cambiado (hash en data/.build-hash).
 */
import { readFile, writeFile, mkdir, readdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import {
  sortCases,
  getCaseFilename,
  buildReadme,
  buildCaseDetailHtml,
  buildSingleIndexHtml,
} from "./report-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const DATA_FILE = join(DATA_DIR, "cases.json");
const DATA_EN_FILE = join(DATA_DIR, "cases-en.json");
const BUILD_HASH_FILE = join(DATA_DIR, ".build-hash");
const CASES_DIR = join(ROOT, "cases");
const CASES_EN_DIR = join(ROOT, "cases-en");

function hash(str) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

async function buildOne(cases, casesDir, reportPath, lang) {
  const sorted = sortCases(cases);
  await mkdir(casesDir, { recursive: true });

  const used = new Set();
  const filenames = sorted.map((c, i) => getCaseFilename(c, i, used));
  const currentFiles = new Set(filenames);

  try {
    const existing = await readdir(casesDir);
    for (const name of existing) {
      if (name.endsWith(".html") && !currentFiles.has(name)) {
        await unlink(join(casesDir, name));
        console.log(`  (${lang}) eliminado obsoleto:`, name);
      }
    }
  } catch (_) {}

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    await writeFile(join(casesDir, filenames[i]), buildCaseDetailHtml(c, i + 1, lang), "utf8");
    console.log(`  (${lang})`, filenames[i]);
  }

  await writeFile(reportPath, buildReadme(sorted, filenames, lang), "utf8");
  return { sorted, filenames };
}

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

  let rawEn = "";
  try {
    rawEn = await readFile(DATA_EN_FILE, "utf8");
  } catch (_) {}

  const currentHash = hash(raw + "\n" + rawEn);
  const force = process.env.BUILD_FORCE === "1";
  if (!force) {
    try {
      const storedHash = (await readFile(BUILD_HASH_FILE, "utf8")).trim();
      if (storedHash === currentHash) {
        console.log("Sin cambios en datos, build omitido. (BUILD_FORCE=1 para forzar)");
        return;
      }
    } catch (_) {}
  }

  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("data/cases.json está vacío o no es un array. Ejecuta: npm run sync");
    process.exit(1);
  }

  console.log("Generando reporte en español…");
  const { sorted: sortedEs, filenames: filenamesEs } = await buildOne(cases, CASES_DIR, join(ROOT, "REPORT.md"), "es");
  console.log("REPORT.md y cases/*.html actualizados.");

  let sortedEn = null;
  let filenamesEn = null;
  if (rawEn) {
    const casesEn = JSON.parse(rawEn);
    if (Array.isArray(casesEn) && casesEn.length > 0) {
      console.log("\nGenerando reporte en inglés…");
      const out = await buildOne(casesEn, CASES_EN_DIR, join(ROOT, "REPORT-en.md"), "en");
      sortedEn = out.sorted;
      filenamesEn = out.filenames;
      console.log("REPORT-en.md y cases-en/*.html actualizados.");
    }
  } else {
    console.log("\n(No existe data/cases-en.json. Ejecuta 'npm run translate' para generar la versión en inglés.)");
  }

  await writeFile(join(ROOT, "index.html"), buildSingleIndexHtml(sortedEs, filenamesEs, sortedEn, filenamesEn), "utf8");
  console.log("index.html (un solo índice ES" + (sortedEn ? " + EN" : "") + ") actualizado.");

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(BUILD_HASH_FILE, currentHash, "utf8");
  console.log(`\nListo. Abre index.html${sortedEn ? " y usa el botón de idioma para ES/EN" : ""} para ver el reporte.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
