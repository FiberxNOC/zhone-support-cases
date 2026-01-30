#!/usr/bin/env node
/**
 * Muestra qué propiedades traemos de data/cases.json por caso.
 * Uso: node scripts/check-props.js [número de casos a listar, default 3]
 * Ejemplo: node scripts/check-props.js 1   → solo el primer caso
 */
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "data", "cases.json");

const limit = parseInt(process.argv[2], 10) || 3;

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
    console.error("data/cases.json está vacío. Ejecuta: npm run sync");
    process.exit(1);
  }

  const caseLevelKeys = ["provider", "model", "device", "serialNumber", "firmwareVersion", "platform"];

  console.log("=== Props que traemos por caso (desde data/cases.json) ===\n");

  for (let i = 0; i < Math.min(limit, cases.length); i++) {
    const c = cases[i];
    const allPropsKeys = Object.keys(c.allProps || {}).filter((k) => k != null && String(k).trim() !== "");
    const emptyNameInAllProps = Object.keys(c.allProps || {}).some((k) => !k || !String(k).trim());
    const caseLevel = caseLevelKeys.filter((key) => c[key] != null && String(c[key]).trim() !== "");

    console.log(`Caso ${i + 1}: ${c.caseName?.slice(0, 50) || "—"}…`);
    console.log(`  Case #: ${c.caseNumber ?? "—"}`);
    console.log(`  allProps (${allPropsKeys.length} claves): ${allPropsKeys.length ? allPropsKeys.join(", ") : "(ninguna)"}`);
    if (emptyNameInAllProps) console.log(`  allProps incluye 1 prop con nombre vacío (se muestra como "No")`);
    console.log(`  Campos de nivel caso con valor: ${caseLevel.length ? caseLevel.join(", ") : "(ninguno)"}`);
    console.log("");
  }

  if (cases.length > limit) {
    console.log(`… y ${cases.length - limit} casos más. Para ver solo el primero: node scripts/check-props.js 1\n`);
  }

  console.log("En la página de detalle de cada caso verás también la línea:");
  console.log('  "Propiedades cargadas en este caso (N): key1, key2, ..."');
  console.log("para comprobar qué props se están mostrando.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
