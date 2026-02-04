#!/usr/bin/env node
/**
 * Corrige ortografía y errores tipográficos en data/cases.json (resumen, notas, detalleDelProblema, resolucion).
 * Usa la misma IA que la traducción: Ollama (por defecto) u OpenAI.
 *
 * Variables de entorno: las mismas que translate (TRANSLATE_AI_PROVIDER, OLLAMA_*, OPENAI_*, TRANSLATE_DELAY_MS).
 * Opcional: CORRECT_SPELLING_DRY_RUN=1 para no guardar (solo mostrar qué se corregiría).
 */
import "dotenv/config";
import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const DATA_FILE = join(DATA_DIR, "cases.json");
const CORRECTED_MANIFEST = join(DATA_DIR, "corrected-spelling.json");

const PROVIDER = (process.env.TRANSLATE_AI_PROVIDER || "ollama").toLowerCase();
const DELAY_MS = parseInt(process.env.TRANSLATE_DELAY_MS, 10) || 300;
const DRY_RUN = process.env.CORRECT_SPELLING_DRY_RUN === "1";
const MAX_CHARS = 6000;

const SPELLING_INSTRUCTION = `Corrige únicamente ortografía y errores tipográficos en el siguiente texto en español.
- No cambies el significado ni la estructura.
- Mantén sin tocar: términos técnicos, nombres de productos (OLT, ONU, Zhone, FiberX, V1-16XC, MXK), números de modelo, comandos, códigos y saltos de línea.
- Responde SOLO con el texto corregido, sin explicaciones ni prefijos.`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function correctWithOllama(text) {
  const base = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const prompt = `${SPELLING_INSTRUCTION}\n\n---\n\n${text}`;

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.message?.content ?? data.response ?? "";
  return String(content).trim();
}

async function correctWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no definida. Añádela a .env o usa Ollama.");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = `${SPELLING_INSTRUCTION}\n\n---\n\n${text}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return String(content).trim();
}

async function correctText(text) {
  if (!text || !String(text).trim()) return "";
  const trimmed = String(text).trim();
  const fn = PROVIDER === "openai" ? correctWithOpenAI : correctWithOllama;

  if (trimmed.length <= MAX_CHARS) return fn(trimmed);

  const parts = [];
  for (let i = 0; i < trimmed.length; i += MAX_CHARS) {
    parts.push(await fn(trimmed.slice(i, i + MAX_CHARS)));
    if (i + MAX_CHARS < trimmed.length) await sleep(DELAY_MS);
  }
  return parts.join("");
}

const TEXT_FIELDS = ["resumen", "notas", "detalleDelProblema", "resolucion"];

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
    console.error("data/cases.json está vacío.");
    process.exit(1);
  }

  let manifest = {};
  try {
    const m = await readFile(CORRECTED_MANIFEST, "utf8");
    manifest = JSON.parse(m);
  } catch (_) {}
  const force = process.env.CORRECT_SPELLING_FORCE === "1";

  const toCorrect = cases.filter((c) => force || manifest[c.id] !== c.lastEditedTime);
  if (toCorrect.length === 0) {
    console.log("Sin cambios: todos los casos ya están corregidos. (CORRECT_SPELLING_FORCE=1 para forzar)");
    return;
  }

  console.log(`Corrigiendo ortografía en ${toCorrect.length}/${cases.length} casos (solo no corregidos) (${PROVIDER})…`);
  if (DRY_RUN) console.log("(Modo dry-run: no se guardarán cambios)\n");

  let updated = 0;
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const needsCorrect = force || manifest[c.id] !== c.lastEditedTime;
    if (!needsCorrect) {
      process.stdout.write(`  ${i + 1}/${cases.length} ${(c.caseNumber || c.id || "").toString().slice(0, 12)} … omitido\n`);
      continue;
    }
    process.stdout.write(`  ${i + 1}/${cases.length} ${(c.caseNumber || c.id || "").toString().slice(0, 12)} …`);
    let changed = false;
    for (const field of TEXT_FIELDS) {
      const val = c[field];
      if (!val || !String(val).trim()) continue;
      try {
        const corrected = await correctText(val);
        await sleep(DELAY_MS);
        if (corrected && corrected !== val) {
          c[field] = corrected;
          changed = true;
        }
      } catch (err) {
        console.warn(`\n    [${field}] ${err.message}`);
      }
    }
    if (changed) updated++;
    manifest[c.id] = c.lastEditedTime;
    console.log(changed ? " corregido" : " ok");
  }

  if (!DRY_RUN) {
    await mkdir(DATA_DIR, { recursive: true });
    if (updated > 0) {
      try {
        await copyFile(DATA_FILE, join(DATA_DIR, "cases.json.bak"));
      } catch (_) {}
      await writeFile(DATA_FILE, JSON.stringify(cases, null, 2), "utf8");
    }
    await writeFile(CORRECTED_MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
    if (updated > 0) {
      console.log(`\nListo: ${updated} casos actualizados. Backup en data/cases.json.bak`);
    } else {
      console.log("\nListo: manifest actualizado (sin cambios de texto).");
    }
  } else if (updated > 0) {
    console.log(`\n(Se habrían actualizado ${updated} casos. Quita CORRECT_SPELLING_DRY_RUN=1 para guardar.)`);
  } else {
    console.log("\nNada que corregir o sin cambios.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
