#!/usr/bin/env node
/**
 * Verifica que data/cases.json sea válido y (opcional) que el build genere
 * index.html y cases/*.html correctamente. Útil para confirmar que sync y build no rompen nada.
 *
 * Uso: node scripts/verify.js [--build]
 *   Sin --build: solo valida data/cases.json
 *   Con --build: además ejecuta build y comprueba que los archivos generados coincidan
 */
import { readFile, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sortCases, getCaseFilename } from "./report-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "cases.json");
const CASES_DIR = join(ROOT, "cases");

const runBuild = process.argv.includes("--build");

function ok(msg) {
  console.log("  ✓", msg);
}
function fail(msg) {
  console.error("  ✗", msg);
}

async function validateCasesJson() {
  let raw;
  try {
    raw = await readFile(DATA_FILE, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      fail("No existe data/cases.json. Ejecuta: npm run sync");
      return null;
    }
    throw err;
  }

  let cases;
  try {
    cases = JSON.parse(raw);
  } catch (err) {
    fail("data/cases.json no es JSON válido: " + err.message);
    return null;
  }

  if (!Array.isArray(cases)) {
    fail("data/cases.json debe ser un array");
    return null;
  }
  ok(`data/cases.json es un array con ${cases.length} casos`);

  const required = ["id", "caseName", "lastEditedTime"];
  const optionalSections = ["resumen", "notas", "detalleDelProblema", "resolucion"];
  let hasError = false;
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    for (const key of required) {
      if (c[key] == null || (typeof c[key] === "string" && c[key].trim() === "")) {
        fail(`Caso ${i + 1} (${c.caseNumber || c.id}): falta o está vacío "${key}"`);
        hasError = true;
      }
    }
    if (!hasError && (c.resumen == null && c.notas == null && c.detalleDelProblema == null && c.resolucion == null)) {
      fail(`Caso ${i + 1} (${c.caseNumber || c.id}): no tiene ninguna sección de contenido (resumen, notas, detalle, resolución)`);
      hasError = true;
    }
  }
  if (!hasError) ok(`Todos los casos tienen id, caseName, lastEditedTime y al menos una sección`);

  return hasError ? null : cases;
}

async function validateBuildOutput(cases) {
  const sorted = sortCases(cases);
  const used = new Set();
  const expectedFiles = sorted.map((c, i) => getCaseFilename(c, i, used));

  try {
    const indexRaw = await readFile(join(ROOT, "index.html"), "utf8");
    if (!indexRaw.includes("Device Providers") || !indexRaw.includes("casos")) {
      fail("index.html no contiene el contenido esperado");
      return false;
    }
    ok("index.html existe y tiene contenido esperado");
  } catch (err) {
    if (err.code === "ENOENT") {
      fail("index.html no existe. Ejecuta: npm run build");
      return false;
    }
    throw err;
  }

  const casesEsDir = join(CASES_DIR, "es");
  let existing;
  try {
    existing = await readdir(casesEsDir);
  } catch (err) {
    if (err.code === "ENOENT") {
      fail("Carpeta cases/es/ no existe. Ejecuta: npm run build");
      return false;
    }
    throw err;
  }

  const htmlFiles = existing.filter((n) => n.endsWith(".html"));
  const expectedSet = new Set(expectedFiles);
  const missing = expectedFiles.filter((f) => !htmlFiles.includes(f));
  const extra = htmlFiles.filter((f) => !expectedSet.has(f));

  if (missing.length > 0) {
    fail(`Faltan ${missing.length} archivo(s) de caso en cases/es/: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`);
  } else {
    ok(`${expectedFiles.length} archivos en cases/es/*.html coinciden con los casos`);
  }
  if (extra.length > 0) {
    fail(`Archivos obsoletos en cases/es/: ${extra.slice(0, 3).join(", ")}${extra.length > 3 ? "…" : ""} (ejecuta npm run build para limpiar)`);
  }

  return missing.length === 0 && extra.length === 0;
}

async function main() {
  console.log("Verificando data/cases.json…");
  const cases = await validateCasesJson();
  if (cases === null) {
    process.exit(1);
  }

  if (runBuild) {
    console.log("\nEjecutando build y verificando salida…");
    const { execSync } = await import("child_process");
    try {
      execSync("node scripts/build-report.js", { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
    } catch (err) {
      fail("Build falló: " + (err.stderr || err.message));
      process.exit(1);
    }
    const buildOk = await validateBuildOutput(cases);
    if (!buildOk) {
      process.exit(1);
    }
  } else {
    console.log("\n(Omitiendo verificación del build. Usa: npm run verify -- --build)");
  }

  console.log("\nTodo correcto.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
