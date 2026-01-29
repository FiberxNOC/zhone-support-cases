#!/usr/bin/env node
/**
 * Sincroniza la base de datos "device-providers-support-cases" de Notion
 * y escribe data/cases.json. Para generar README e HTML: npm run build
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { writeFile, mkdir } from "fs/promises";
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
    allProps["Platform"] ?? allProps["Patform"] ?? getProp(page, ["Platform", "Patform"]) ?? getPropByKeyMatch(allProps, "platform", "plataforma");
  const model =
    allProps["Model"] ?? getProp(page, ["Model"]) ?? getPropByKeyMatch(allProps, "model", "modelo");
  const firmwareVersion =
    allProps["Firmware Version"] ?? allProps["Firmware"] ?? allProps["FW"] ?? getProp(page, ["Firmware Version", "Firmware", "FW"]) ?? getPropByKeyMatch(allProps, "firmware", "fw", "version");

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

async function main() {
  console.log("Conectando a Notion y leyendo base de datos…");
  let db;
  let pages;
  try {
    db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
    pages = await fetchAllPages();
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

  console.log("Leyendo contenido de cada caso (Resumen, Detalle, Resolución, Notas)…");
  for (const c of cases) {
    try {
      const blocks = await fetchAllBlocks(c.id);
      const sections = await parsePageSections(blocks);
      Object.assign(c, sections);
    } catch (err) {
      console.warn(`  No se pudo leer contenido del caso ${c.caseNumber || c.id}:`, err.message);
    }
  }

  await mkdir(DATA_DIR, { recursive: true });
  const dataPath = join(DATA_DIR, "cases.json");
  await writeFile(dataPath, JSON.stringify(cases, null, 2), "utf8");
  console.log(`\nListo: ${cases.length} casos guardados en data/cases.json. Ejecuta "npm run build" para generar README.md, index.html y cases/*.`);
}

main();
