#!/usr/bin/env node
/**
 * Genera report.pdf desde data/cases.json (índice + todos los casos).
 * Uso: npm run pdf
 * Requiere: npm run build (o tener data/cases.json) y puppeteer instalado.
 */
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sortCases, buildPdfHtml } from "./report-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "cases.json");
const PDF_PATH = join(ROOT, "report.pdf");

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
  const html = buildPdfHtml(sorted);

  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch (err) {
    console.error("Puppeteer no está instalado. Ejecuta: npm install puppeteer");
    process.exit(1);
  }

  console.log("Generando PDF…");
  const browser = await puppeteer.default.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: PDF_PATH,
      format: "A4",
      margin: { top: "1.5cm", right: "1.5cm", bottom: "1.5cm", left: "1.5cm" },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }

  console.log(`Listo: ${PDF_PATH}`);
  console.log("Puedes adjuntar report.pdf a un email.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
