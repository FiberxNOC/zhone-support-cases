#!/usr/bin/env node
/**
 * Traduce el contenido de data/cases.json (español) a inglés usando IA y escribe data/cases-en.json.
 * Por defecto usa Ollama en tu PC (sin API key). Opcional: OpenAI si defines OPENAI_API_KEY.
 *
 * Variables de entorno:
 *   TRANSLATE_AI_PROVIDER = "ollama" | "openai" (default: ollama)
 *   OLLAMA_BASE_URL (default: http://localhost:11434)
 *   OLLAMA_MODEL (default: llama3.2)
 *   OPENAI_API_KEY (solo si provider=openai)
 *   OPENAI_MODEL (default: gpt-4o-mini)
 *   TRANSLATE_DELAY_MS (default: 300) — pausa entre peticiones para no saturar
 */
import "dotenv/config";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const DATA_FILE = join(DATA_DIR, "cases.json");
const DATA_EN_FILE = join(DATA_DIR, "cases-en.json");

const PROVIDER = (process.env.TRANSLATE_AI_PROVIDER || "ollama").toLowerCase();
const DELAY_MS = parseInt(process.env.TRANSLATE_DELAY_MS, 10) || 300;
const MAX_CHARS = 6000;

const TRANSLATION_INSTRUCTION = `Translate the following text from Spanish to English for a technical support report.
- Keep technical terms, product names (OLT, ONU, Zhone, FiberX, V1-16XC, MXK, etc.), model numbers and codes unchanged.
- Preserve line breaks and structure.
- Output ONLY the translation, no preamble or explanation.`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Traduce con Ollama (local).
 */
async function translateWithOllama(text) {
  const base = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  const prompt = `${TRANSLATION_INSTRUCTION}\n\n---\n\n${text}`;

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

/**
 * Traduce con OpenAI (API).
 */
async function translateWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no definida. Añádela a .env o usa Ollama (TRANSLATE_AI_PROVIDER=ollama).");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = `${TRANSLATION_INSTRUCTION}\n\n---\n\n${text}`;

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

async function translateText(text) {
  if (!text || !String(text).trim()) return "";
  const trimmed = String(text).trim();

  if (trimmed.length <= MAX_CHARS) {
    const fn = PROVIDER === "openai" ? translateWithOpenAI : translateWithOllama;
    return fn(trimmed);
  }

  const parts = [];
  for (let i = 0; i < trimmed.length; i += MAX_CHARS) {
    const chunk = trimmed.slice(i, i + MAX_CHARS);
    const fn = PROVIDER === "openai" ? translateWithOpenAI : translateWithOllama;
    parts.push(await fn(chunk));
    if (i + MAX_CHARS < trimmed.length) await sleep(DELAY_MS);
  }
  return parts.join("");
}

/**
 * Traduce un caso: caseName, resumen, detalleDelProblema, resolucion, notas.
 */
async function translateCase(c, index, total) {
  const out = { ...c };
  const fields = ["caseName", "resumen", "detalleDelProblema", "resolucion", "notas"];

  for (const field of fields) {
    const val = c[field];
    if (!val || !String(val).trim()) continue;
    try {
      out[field] = await translateText(val);
      await sleep(DELAY_MS);
    } catch (err) {
      console.warn(`  [${index + 1}/${total}] ${field}: ${err.message}`);
    }
  }

  return out;
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

  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    console.error("data/cases.json está vacío. Ejecuta: npm run sync");
    process.exit(1);
  }

  let existingEn = [];
  try {
    const rawEn = await readFile(DATA_EN_FILE, "utf8");
    const parsed = JSON.parse(rawEn);
    if (Array.isArray(parsed)) existingEn = parsed;
  } catch (_) {}
  const enById = new Map(existingEn.filter((c) => c.id).map((c) => [c.id, c]));

  const force = process.env.TRANSLATE_FORCE === "1";
  const toTranslate = cases.filter((c) => {
    if (force) return true;
    const prev = enById.get(c.id);
    if (!prev) return true;
    return prev._sourceLastEditedTime !== c.lastEditedTime;
  });

  if (toTranslate.length === 0) {
    console.log("Sin cambios: todos los casos ya están traducidos. (TRANSLATE_FORCE=1 para forzar re-traducción)");
    return;
  }

  if (PROVIDER === "ollama") {
    console.log("Traducción con IA local (Ollama). Asegúrate de tener Ollama corriendo (ollama serve) y el modelo (ej. ollama pull llama3.2).");
  } else {
    console.log("Traducción con OpenAI (API).");
  }
  console.log(`Proveedor: ${PROVIDER} | delay: ${DELAY_MS}ms`);
  console.log(`Traduciendo ${toTranslate.length}/${cases.length} casos (solo nuevos o modificados)…\n`);

  let translatedCount = 0;
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const prev = enById.get(c.id);
    const needsTranslate = force || !prev || prev._sourceLastEditedTime !== c.lastEditedTime;
    if (!needsTranslate) {
      enById.set(c.id, { ...prev, _sourceLastEditedTime: c.lastEditedTime });
      continue;
    }
    process.stdout.write(`  ${i + 1}/${cases.length} …`);
    const t = await translateCase(c, i, cases.length);
    t._sourceLastEditedTime = c.lastEditedTime;
    enById.set(c.id, t);
    translatedCount++;
    console.log(" ok");
  }

  const out = cases.map((c) => enById.get(c.id) ?? { ...c, caseName: c.caseName, resumen: "", detalleDelProblema: "", resolucion: "", notas: "", _sourceLastEditedTime: c.lastEditedTime });

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_EN_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nListo: ${DATA_EN_FILE}${translatedCount > 0 ? ` (${translatedCount} traducidos)` : " (sin cambios)"}. Ejecuta "npm run build" para generar REPORT-en.md, index-en.html y cases-en/*.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
