#!/usr/bin/env node
/**
 * Sincroniza la base de datos "device-providers-support-cases" de Notion
 * y escribe data/cases.json. Para generar README e HTML: npm run build
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error(
    "Falta NOTION_API_KEY o NOTION_DATABASE_ID. Copia .env.example a .env y rellena los valores."
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

// Secciones del cuerpo de cada caso (plantilla Notion)

function getBlockText(block) {
  const type = block.type;
  const data = block[type];
  if (!data) return "";
  if (data.rich_text) return data.rich_text.map((t) => t.plain_text).join("");
  if (data.caption) return data.caption.map((t) => t.plain_text).join("");
  return "";
}

function normalizeSectionTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
}

/** Recupera todos los bloques de una página (paginado). */
async function fetchAllBlocks(blockId) {
  const blocks = [];
  let cursor = undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.next_cursor ?? null;
  } while (cursor);
  return blocks;
}

/** Detecta a qué sección pertenece un título (por coincidencia exacta o que contenga la palabra). */
function sectionKeyFromTitle(normalized) {
  if (!normalized) return null;
  if (normalized === "resumen" || normalized.startsWith("resumen")) return "resumen";
  if (normalized === "notas" || normalized.startsWith("notas")) return "notas";
  if (
    normalized === "detalle del problema" ||
    normalized.includes("detalle del problema") ||
    normalized.startsWith("detalle")
  )
    return "detalleDelProblema";
  if (
    normalized === "resolucion" ||
    normalized === "resolución" ||
    normalized.startsWith("resolucion") ||
    normalized.startsWith("resolución")
  )
    return "resolucion";
  return null;
}

/** Extrae Resumen, Detalle del problema, Resolución y Notas del contenido de la página. */
async function parsePageSections(blocks) {
  const sections = { resumen: "", notas: "", detalleDelProblema: "", resolucion: "" };
  let currentKey = null;
  const parts = [];

  async function processBlock(block, isSubBlock = false) {
    const type = block.type;
    const text = getBlockText(block);
    const normalized = normalizeSectionTitle(text);
    const isHeading =
      type === "heading_1" || type === "heading_2" || type === "heading_3";
    const isParagraphSectionHeader =
      !isSubBlock &&
      type === "paragraph" &&
      /^(resumen|notas|detalle del problema|resoluci[oó]n)\.?\s*$/i.test(normalized);

    if (isHeading || (!isSubBlock && isParagraphSectionHeader)) {
      const key = sectionKeyFromTitle(normalized);
      if (key) {
        if (currentKey) {
          sections[currentKey] = parts.join("\n\n").trim();
          parts.length = 0;
        }
        currentKey = key;
        return;
      }
    }

    if (currentKey && text) {
      if (type === "bulleted_list_item" || type === "numbered_list_item") {
        parts.push(`- ${text}`);
      } else if (
        type === "paragraph" ||
        type === "quote" ||
        type === "callout" ||
        type === "toggle" ||
        type === "code"
      ) {
        parts.push(text);
      }
    }

    // Recorrer hijos siempre (column_list, column, etc.) para encontrar Resumen/Notas dentro de columnas
    if (block.has_children) {
      try {
        const children = await fetchAllBlocks(block.id);
        for (const ch of children) {
          await processBlock(ch, true);
        }
      } catch (_) {}
    }
  }

  for (const block of blocks) {
    await processBlock(block);
  }

  if (currentKey) sections[currentKey] = parts.join("\n\n").trim();

  return sections;
}

/** Extrae un valor legible de cualquier tipo de propiedad de Notion (para traer todas las props). */
function getPropValue(p) {
  if (!p) return null;
  if (p.title) return p.title.map((t) => t.plain_text).join("") || null;
  if (p.rich_text) return p.rich_text.map((t) => t.plain_text).join("") || null;
  if (p.number !== undefined && typeof p.number === "number") return p.number;
  if (p.number !== undefined && p.number != null && typeof p.number === "object" && "format" in p.number) return null;
  if (p.select) return p.select.name ?? null;
  if (p.status) return p.status.name ?? null;
  if (p.date?.start) return { start: p.date.start, end: p.date.end };
  if (p.multi_select?.length) return p.multi_select.map((s) => s.name);
  if (p.files?.length) return p.files.map((f) => f.name || f.file?.url).filter(Boolean);
  if (p.formula) {
    const f = p.formula;
    if (f.string != null) return f.string;
    if (f.number != null) return f.number;
    if (f.boolean != null) return String(f.boolean);
    if (f.date?.start) return { start: f.date.start, end: f.date.end };
  }
  if (p.url) return p.url;
  if (p.email) return p.email;
  if (p.phone_number) return p.phone_number;
  if (p.checkbox !== undefined) return p.checkbox;
  if (p.created_time) return p.created_time;
  if (p.last_edited_time) return p.last_edited_time;
  if (p.created_by) return p.created_by.name ?? p.created_by.id ?? null;
  if (p.last_edited_by) return p.last_edited_by.name ?? p.last_edited_by.id ?? null;
  if (p.people?.length) return p.people.map((u) => u.name ?? u.id).filter(Boolean).join(", ");
  if (p.relation?.length) return p.relation.map((r) => r.id).join(", ");
  if (p.rollup) {
    const r = p.rollup;
    if (r.type === "number" && r.number != null) return r.number;
    if (r.type === "date" && r.date?.start) return r.date.start;
    if (r.type === "array" && r.array?.length) {
      return r.array.map((i) => i.title?.map((t) => t.plain_text).join("") ?? i.rich_text?.map((t) => t.plain_text).join("") ?? i.name ?? i.id).filter(Boolean).join(", ");
    }
    if (r.type === "incomplete" || r.type === "unsupported") return null;
  }
  if (p.unique_id) {
    const u = p.unique_id;
    return u.prefix ? `${u.prefix}-${u.number}` : String(u.number);
  }
  if (p.verification) return p.verification.state ?? null;
  return null;
}

/** Todas las propiedades de la página usando los nombres del esquema de la base (trae todas las props de Notion). */
function getAllPropsFromSchema(db, page) {
  const out = {};
  const schema = db.properties || {};
  const props = page.properties || {};
  for (const [propId, propSchema] of Object.entries(schema)) {
    const name = propSchema.name;
    const raw = props[propId] ?? props[propSchema.id] ?? props[name];
    const value = getPropValue(raw);
    if (value != null) {
      if (typeof value === "object" && !Array.isArray(value) && value.start) out[name] = value.start;
      else if (Array.isArray(value)) out[name] = value.join(", ");
      else if (typeof value === "boolean") out[name] = value ? "Yes" : "No";
      else out[name] = value;
    }
  }
  return out;
}

function getProp(page, nameOrAliases) {
  const names = Array.isArray(nameOrAliases) ? nameOrAliases : [nameOrAliases];
  const props = page.properties || {};
  for (const name of names) {
    const p = props[name];
    const v = getPropValue(p);
    if (v != null) {
      if (typeof v === "object" && v.start) return v;
      return v;
    }
  }
  return null;
}

/** Primer valor no vacío de allProps cuya clave coincida con algún patrón (ej. /status/i). */
function getPropByKeyMatch(allProps, ...patterns) {
  if (!allProps || typeof allProps !== "object") return null;
  for (const pattern of patterns) {
    const re = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
    for (const [key, value] of Object.entries(allProps)) {
      if (re.test(key) && value != null && String(value).trim() !== "") return value;
    }
  }
  return null;
}

/** Alias de Notion para Platform / Model / FW (mismo mapeo que report-utils). */
const NOTION_PROP_ALIASES = {
  platform: ["Platform", "Patform", "Plataforma"],
  model: ["Model", "Model.", "Modelo"],
  fw: ["Firmware Version", "Firmware", "FW"],
};

/** Primer valor no vacío de allProps cuya clave (trim + lowercase) coincida con algún alias. */
function getFromAllPropsByNormalizedKey(allProps, ...internalKeys) {
  if (!allProps || typeof allProps !== "object") return null;
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  for (const key of internalKeys) {
    const aliases = NOTION_PROP_ALIASES[key];
    if (!aliases) continue;
    for (const [propKey, value] of Object.entries(allProps)) {
      if (value == null || String(value).trim() === "") continue;
      const propNorm = norm(propKey);
      for (const alias of aliases) {
        if (propNorm === norm(alias)) return String(value).trim();
      }
    }
  }
  return null;
}

/** Infiere model, platform y firmwareVersion desde nombre del caso y texto cuando Notion no los tiene. */
function inferDeviceInfo(c) {
  const text = [c.caseName, c.resumen, c.notas, c.detalleDelProblema].filter(Boolean).join("\n");
  if (!text) return { model: null, platform: null, firmwareVersion: null };

  const modelPatterns = [
    /\b(?:ONT|ONU)\s+model\s+(\S+)/i,
    /\b(?:ONT|ONU)\s+(\d{4}[A-Z0-9-]*)/i,
    /\b(2466GN|5302|5228XG)\b/i,
    /\b(MXK-F108|MXK-F-108)\b/i,
    /\b(LTF5308B-BHB\+|LTF5308B-BCA\+|XGS-GP-COMBO-SFP\+?)\b/i,
    /\bmodel\s+(\S+)/i,
  ];
  const platformPatterns = [
    /\b(V1-16XC|v1-16xc)\b/i,
    /\b(MXK-F108|MXK-F-108|MXK\s*F-?108)\b/i,
    /\bOLT\s+(V1-16XC|MXK[^\s]*)/i,
  ];
  const fwPatterns = [
    /\b(S7\.0\.\d{3})\b/i,
    /\b(7\.0\.\d{3})\b/,
    /\b(0?70\d{4})\b/,
    /\b(MXK\s+[\d.]+(?:\.[\d.]+)*)\b/i,
    /\b(?:sw load|firmware|version)\s*[:\s]+(\S+)/i,
  ];

  const firstMatch = (str, patterns) => {
    for (const re of patterns) {
      const m = str.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return null;
  };

  return {
    model: firstMatch(text, modelPatterns),
    platform: firstMatch(text, platformPatterns),
    firmwareVersion: firstMatch(text, fwPatterns),
  };
}

function parsePage(page, db) {
  const allProps = db ? getAllPropsFromSchema(db, page) : {};
  const caseName =
    allProps["Case Name"] ?? allProps["Name"] ?? getProp(page, ["Case Name", "Name"]) ?? "Sin nombre";
  const created = allProps["Created Date"] ?? getProp(page, ["Created Date", "Created"]);
  const createdStr =
    created && typeof created === "object" && created.start
      ? created.start
      : typeof created === "string"
        ? created
        : null;
  const due = allProps["Due Date"] ?? getProp(page, ["Due Date", "Due"]);
  const dueStr =
    due && typeof due === "object" && due.start ? due.start : typeof due === "string" ? due : null;
  const caseNumber = allProps["Case Number"] ?? getProp(page, ["Case Number"]);
  const status =
    allProps["Status"] ?? getProp(page, ["Status"]) ?? getPropByKeyMatch(allProps, "status", "estado");
  const afectation =
    allProps["Affectation"] ?? allProps["Afectation"] ?? getProp(page, ["Affectation", "Afectation"]);

  const platform =
    getFromAllPropsByNormalizedKey(allProps, "platform") ?? getProp(page, ["Platform", "Patform"]) ?? getPropByKeyMatch(allProps, "platform", "plataforma");
  const model =
    getFromAllPropsByNormalizedKey(allProps, "model") ?? getProp(page, ["Model", "Model."]) ?? getPropByKeyMatch(allProps, "model", "modelo");
  const firmwareVersion =
    getFromAllPropsByNormalizedKey(allProps, "fw") ?? getProp(page, ["Firmware Version", "Firmware", "FW"]) ?? getPropByKeyMatch(allProps, "firmware", "fw", "version");

  return {
    id: page.id,
    caseName: String(caseName),
    allProps,
    provider: allProps["Provider"] ?? getProp(page, ["Provider"]) ?? getPropByKeyMatch(allProps, "provider"),
    caseNumber: caseNumber != null ? String(caseNumber) : null,
    status: status ?? null,
    createdDate: createdStr,
    dueDate: dueStr,
    failureType: allProps["Failure Type"] ?? getProp(page, ["Failure Type"]),
    afectation,
    internalTicket: allProps["Internal Ticket"] ?? getProp(page, ["Internal Ticket"]),
    device: allProps["Device"] ?? getProp(page, ["Device"]),
    serialNumber: allProps["Serial Number"] ?? getProp(page, ["Serial Number"]),
    model: model ?? null,
    firmwareVersion: firmwareVersion != null ? String(firmwareVersion) : null,
    platform: platform ?? null,
    notionUrl: page.url,
    lastEditedTime: page.last_edited_time || null,
  };
}

async function fetchAllPages() {
  const results = [];
  let cursor = undefined;
  do {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...response.results);
    cursor = response.next_cursor ?? null;
  } while (cursor);
  return results;
}

/** Ejecuta tareas async con un máximo de N en paralelo (evita saturar la API). */
async function runWithConcurrency(tasks, concurrency = 5) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => {
      executing.delete(p);
    };
    p.finally(clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function main() {
  const startMs = Date.now();
  console.log("Conectando a Notion y leyendo base de datos…");
  let db;
  let pages;
  try {
    const [dbResult, pagesResult] = await Promise.all([
      notion.databases.retrieve({ database_id: NOTION_DATABASE_ID }),
      fetchAllPages(),
    ]);
    db = dbResult;
    pages = pagesResult;
  } catch (err) {
    if (err.code === "object_not_found" || err.status === 404) {
      console.error(
        "No se encontró la base de datos o no tiene acceso. Revisa NOTION_DATABASE_ID y que la base esté compartida con tu integración."
      );
    } else {
      console.error("Error de Notion:", err.message);
    }
    process.exit(1);
  }

  const cases = pages
    .map((p) => parsePage(p, db))
    .filter((c) => c.caseName && c.caseName !== "Sin nombre");

  const dataPath = join(DATA_DIR, "cases.json");
  let cacheById = new Map();
  let previousRaw = null;
  try {
    previousRaw = await readFile(dataPath, "utf8");
    const existing = JSON.parse(previousRaw);
    if (Array.isArray(existing)) {
      for (const prev of existing) {
        if (prev.id && prev.lastEditedTime != null) {
          cacheById.set(prev.id, {
            lastEditedTime: prev.lastEditedTime,
            resumen: prev.resumen ?? "",
            notas: prev.notas ?? "",
            detalleDelProblema: prev.detalleDelProblema ?? "",
            resolucion: prev.resolucion ?? "",
          });
        }
      }
    }
  } catch (_) {}

  const CONCURRENCY = Math.min(Math.max(1, parseInt(process.env.SYNC_CONCURRENCY, 10) || 4), 10);
  let skipped = 0;
  console.log(`Leyendo contenido de cada caso (Resumen, Detalle, Resolución, Notas)… (${CONCURRENCY} en paralelo)`);
  await runWithConcurrency(
    cases.map((c) => async () => {
      const cached = cacheById.get(c.id);
      const sameTime = cached && String(cached.lastEditedTime) === String(c.lastEditedTime ?? "");
      if (sameTime) {
        c.resumen = cached.resumen;
        c.notas = cached.notas;
        c.detalleDelProblema = cached.detalleDelProblema;
        c.resolucion = cached.resolucion;
        skipped++;
        return;
      }
      try {
        const blocks = await fetchAllBlocks(c.id);
        const sections = await parsePageSections(blocks);
        Object.assign(c, sections);
      } catch (err) {
        console.warn(`  No se pudo leer contenido del caso ${c.caseNumber || c.id}:`, err.message);
      }
    }),
    CONCURRENCY
  );
  if (skipped > 0) console.log(`  (${skipped} sin cambios, reutilizando contenido anterior)`);
  if (skipped === cases.length && cases.length > 0) console.log(`  (El tiempo restante es la consulta a Notion para comprobar si hubo cambios.)`);

  // Si Model, Platform o FW no vienen de Notion, intentar inferir desde nombre y texto
  for (const c of cases) {
    if (c.model == null || c.platform == null || c.firmwareVersion == null) {
      const inferred = inferDeviceInfo(c);
      if (c.model == null && inferred.model) c.model = inferred.model;
      if (c.platform == null && inferred.platform) c.platform = inferred.platform;
      if (c.firmwareVersion == null && inferred.firmwareVersion) c.firmwareVersion = inferred.firmwareVersion;
    }
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  const newRaw = JSON.stringify(cases, null, 2);
  const unchanged = previousRaw != null && previousRaw === newRaw;
  if (unchanged) {
    console.log(`\nSin cambios: ${cases.length} casos, data/cases.json no modificado (${elapsed}s).`);
  } else {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(dataPath, newRaw, "utf8");
    console.log(`\nListo: ${cases.length} casos guardados en data/cases.json (${elapsed}s). Ejecuta "npm run build" para generar REPORT.md, index.html y cases/*.`);
  }
}

main();
