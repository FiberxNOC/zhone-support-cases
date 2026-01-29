#!/usr/bin/env node
/**
 * Sincroniza la base de datos "device-providers-support-cases" de Notion
 * y genera un repositorio de markdown listo para GitHub (reporte para externos).
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CASES_DIR = join(ROOT, "cases");

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

    if (!isSubBlock && (isHeading || isParagraphSectionHeader)) {
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
        type === "toggle"
      ) {
        parts.push(text);
      }
    }

    if (currentKey && block.has_children) {
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

// Orden para presentar: primero por estado (activos primero), luego por afectación, luego por fecha.
// Si en Notion el estado tiene otro nombre (ej. "Escalated to Engineering"), añádelo aquí.
const STATUS_ORDER = [
  "Not started",
  "In progress",
  "Escalated to En...",
  "Escalated to Engineering",
  "Fix Scheduled",
  "Done",
];
const AFECTATION_ORDER = ["Critical 🔥", "High 🚨", "Normal", "Low"];

function getPropValue(p) {
  if (!p) return null;
  if (p.title) return p.title.map((t) => t.plain_text).join("") || null;
  if (p.rich_text) return p.rich_text.map((t) => t.plain_text).join("") || null;
  if (p.number !== undefined) return p.number;
  if (p.select) return p.select.name ?? null;
  if (p.date?.start) return { start: p.date.start, end: p.date.end };
  if (p.multi_select?.length) return p.multi_select.map((s) => s.name);
  if (p.files?.length) return p.files.map((f) => f.name || f.file?.url).filter(Boolean);
  return null;
}

/** Todas las propiedades de la página usando los nombres del esquema de la base. */
function getAllPropsFromSchema(db, page) {
  const out = {};
  const schema = db.properties || {};
  const props = page.properties || {};
  for (const [propId, propSchema] of Object.entries(schema)) {
    const name = propSchema.name;
    const raw = props[propId] ?? props[name];
    const value = getPropValue(raw);
    if (value != null) {
      if (typeof value === "object" && value.start) out[name] = value.start;
      else if (Array.isArray(value)) out[name] = value.join(", ");
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
  const status = allProps["Status"] ?? getProp(page, ["Status"]);
  const afectation =
    allProps["Affectation"] ?? allProps["Afectation"] ?? getProp(page, ["Affectation", "Afectation"]);

  return {
    id: page.id,
    caseName: String(caseName),
    allProps,
    provider: allProps["Provider"] ?? getProp(page, ["Provider"]),
    caseNumber: caseNumber != null ? String(caseNumber) : null,
    status: status ?? getProp(page, ["Status"]),
    createdDate: createdStr,
    dueDate: dueStr,
    failureType: allProps["Failure Type"] ?? getProp(page, ["Failure Type"]),
    afectation,
    internalTicket: allProps["Internal Ticket"] ?? getProp(page, ["Internal Ticket"]),
    device: allProps["Device"] ?? getProp(page, ["Device"]),
    serialNumber: allProps["Serial Number"] ?? getProp(page, ["Serial Number"]),
    model: allProps["Model"] ?? getProp(page, ["Model"]),
    firmwareVersion: allProps["Firmware Version"] ?? getProp(page, ["Firmware Version"]),
    platform: allProps["Platform"] ?? allProps["Patform"] ?? getProp(page, ["Platform", "Patform"]),
    notionUrl: page.url,
    lastEditedTime: page.last_edited_time || null,
  };
}

/** Calcula días y texto para "tiempo abierto" o "tiempo hasta cierre". */
function computeTimeInfo(c) {
  const now = new Date();
  const created = c.createdDate ? new Date(c.createdDate) : null;
  const due = c.dueDate ? new Date(c.dueDate) : null;
  const lastEdit = c.lastEditedTime ? new Date(c.lastEditedTime) : null;
  const isDone = /done|cerrado/i.test(String(c.status || ""));

  const msPerDay = 24 * 60 * 60 * 1000;
  let daysOpen = null;
  let label = "";
  let subLabel = "";

  if (created) {
    const endDate = isDone && lastEdit ? lastEdit : now;
    daysOpen = Math.floor((endDate - created) / msPerDay);
    if (isDone) {
      label = daysOpen <= 0 ? "Cerrado el mismo día" : `Cerrado en ${daysOpen} día${daysOpen !== 1 ? "s" : ""}`;
    } else {
      label = daysOpen <= 0 ? "Abierto hoy" : `Abierto hace ${daysOpen} día${daysOpen !== 1 ? "s" : ""}`;
    }
  }
  if (due && !isDone) {
    const daysUntilDue = Math.floor((due - now) / msPerDay);
    if (daysUntilDue > 0) subLabel = `Vence en ${daysUntilDue} día${daysUntilDue !== 1 ? "s" : ""}`;
    else if (daysUntilDue === 0) subLabel = "Vence hoy";
    else subLabel = `Vencido hace ${Math.abs(daysUntilDue)} día${Math.abs(daysUntilDue) !== 1 ? "s" : ""}`;
  }

  return { daysOpen, label, subLabel };
}

function slug(str) {
  return String(str)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .toLowerCase();
}

function sortCases(cases) {
  return [...cases].sort((a, b) => {
    const statusA = STATUS_ORDER.indexOf(a.status) ?? STATUS_ORDER.length;
    const statusB = STATUS_ORDER.indexOf(b.status) ?? STATUS_ORDER.length;
    if (statusA !== statusB) return statusA - statusB;

    const afectA =
      AFECTATION_ORDER.indexOf(a.afectation) ?? AFECTATION_ORDER.length;
    const afectB =
      AFECTATION_ORDER.indexOf(b.afectation) ?? AFECTATION_ORDER.length;
    if (afectA !== afectB) return afectA - afectB;

    const dateA = a.createdDate || "";
    const dateB = b.createdDate || "";
    return dateB.localeCompare(dateA);
  });
}

function caseToMarkdown(c, index) {
  const lines = [
    `# ${index}. ${c.caseName}`,
    "",
    "| Campo | Valor |",
    "|------|-------|",
  ];

  for (const [name, value] of Object.entries(c.allProps || {})) {
    const str = value == null ? "" : String(value);
    if (str) lines.push(`| ${name} | ${str.replace(/\n/g, " ")} |`);
  }

  if (c.resumen) {
    lines.push("", "## Resumen", "", c.resumen, "");
  }
  if (c.detalleDelProblema) {
    lines.push("", "## Detalle del problema", "", c.detalleDelProblema, "");
  }
  if (c.resolucion) {
    lines.push("", "## Resolución", "", c.resolucion, "");
  }
  if (c.notas) {
    lines.push("", "## Notas", "", c.notas, "");
  }

  lines.push("", `[Ver en Notion](${c.notionUrl})`, "");
  return lines.join("\n");
}

function buildReadme(cases) {
  const lines = [
    "# Device Providers – Support Cases",
    "",
    "Reporte generado desde la base de datos **device-providers-support-cases** de Notion, para presentación a personas externas.",
    "",
    "## Resumen",
    "",
    `Total de casos: **${cases.length}**. Enlaces directos a cada caso:`,
    "",
  ];

  cases.forEach((c, i) => {
    const fileSlug = slug(c.caseName);
    const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.md`;
    const shortTitle =
      c.caseName.length > 70 ? c.caseName.slice(0, 70) + "…" : c.caseName;
    lines.push(`- [**${i + 1}.** ${shortTitle}](cases/${filename}) — ${c.status || "—"} · ${c.afectation || "—"}`);
  });

  lines.push(
    "",
    "---",
    "",
    "## Índice de casos (tabla)",
    "",
    "| # | Case Name | Provider | Case # | Status | Affectation | Created |",
    "|---|-----------|----------|--------|--------|-------------|--------|",
  );

  cases.forEach((c, i) => {
    const fileSlug = slug(c.caseName);
    const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.md`;
    const link = `[${c.caseName.slice(0, 50)}${c.caseName.length > 50 ? "…" : ""}](cases/${filename})`;
    lines.push(
      `| ${i + 1} | ${link} | ${c.provider || "—"} | ${c.caseNumber || "—"} | ${c.status || "—"} | ${c.afectation || "—"} | ${c.createdDate || "—"} |`
    );
  });

  lines.push(
    "",
    "---",
    "",
    "*FX NetOps Team 2026 · [noc@fiberx.net](mailto:noc@fiberx.net) · [fiberx.net](https://fiberx.net)*",
    ""
  );
  return lines.join("\n");
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Genera index.html con fichas, badges y tiempo calculado (aspecto web). */
function buildHtml(cases) {
  const timeInfos = cases.map((c) => computeTimeInfo(c));
  const statusColors = {
    Done: "#22c55e",
    "Fix Scheduled": "#f59e0b",
    "In progress": "#3b82f6",
    "Not started": "#6b7280",
    "Escalated to En...": "#ec4899",
    "Escalated to Engineering": "#ec4899",
  };
  const afectacionColors = {
    "Critical 🔥": "#dc2626",
    "High 🚨": "#ea580c",
    Normal: "#6b7280",
    Low: "#22c55e",
  };

  const cardsHtml = cases
    .map((c, i) => {
      const time = timeInfos[i];
      const fileSlug = slug(c.caseName);
      const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.md`;
      const statusColor = statusColors[c.status] || "#6b7280";
      const afectColor = afectacionColors[c.afectation] || "#6b7280";
      return `
    <article class="card">
      <div class="card-header">
        <span class="card-num">#${i + 1}</span>
        <div class="badges">
          ${c.status ? `<span class="badge badge-status" style="--badge-color:${statusColor}">${escapeHtml(c.status)}</span>` : ""}
          ${c.provider ? `<span class="badge badge-provider">${escapeHtml(c.provider)}</span>` : ""}
          ${c.afectation ? `<span class="badge badge-afect" style="--badge-color:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
        </div>
      </div>
      <h2 class="card-title"><a href="cases/${filename}">${escapeHtml(c.caseName)}</a></h2>
      <div class="card-meta">
        ${c.caseNumber ? `<span>Case <strong>${escapeHtml(c.caseNumber)}</strong></span>` : ""}
        ${c.createdDate ? `<span>${escapeHtml(c.createdDate)}</span>` : ""}
      </div>
      <div class="card-time">
        ${time.label ? `<span class="time-label">${escapeHtml(time.label)}</span>` : ""}
        ${time.subLabel ? `<span class="time-sublabel">${escapeHtml(time.subLabel)}</span>` : ""}
      </div>
      <div class="card-actions">
        <a href="cases/${filename}" class="btn btn-secondary">Ver detalle</a>
        <a href="${escapeHtml(c.notionUrl)}" target="_blank" rel="noopener" class="btn btn-link">Notion →</a>
      </div>
    </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Device Providers – Support Cases</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-hover: #334155;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --radius: 12px;
      --shadow: 0 4px 20px rgba(0,0,0,.3);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
    header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--surface-hover);
    }
    header h1 { margin: 0 0 0.5rem; font-size: 1.75rem; font-weight: 700; }
    header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    .stats {
      display: flex; gap: 1.5rem; margin-top: 1rem; flex-wrap: wrap;
    }
    .stats span { color: var(--text-muted); font-size: 0.9rem; }
    .stats strong { color: var(--accent); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }
    .card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 1.25rem;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: background 0.2s;
    }
    .card:hover { background: var(--surface-hover); }
    .card-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .card-num { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
    .badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .badge {
      font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 6px;
      font-weight: 600; background: var(--badge-color, var(--surface-hover)); color: #fff;
    }
    .badge-provider { background: #6366f1; }
    .card-title { margin: 0; font-size: 1rem; font-weight: 600; line-height: 1.35; }
    .card-title a { color: inherit; text-decoration: none; }
    .card-title a:hover { color: var(--accent); text-decoration: underline; }
    .card-meta { font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 1rem; flex-wrap: wrap; }
    .card-time { font-size: 0.85rem; }
    .time-label { color: var(--accent); font-weight: 500; }
    .time-sublabel { color: var(--text-muted); margin-left: 0.5rem; }
    .card-actions { display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem; }
    .btn {
      display: inline-block; padding: 0.4rem 0.75rem; border-radius: 8px;
      font-size: 0.85rem; text-decoration: none; font-weight: 500;
    }
    .btn-secondary { background: var(--surface-hover); color: var(--text); }
    .btn-secondary:hover { background: #475569; }
    .btn-link { color: var(--accent); }
    .btn-link:hover { text-decoration: underline; }
    .footer { margin-top: 2rem; padding-top: 1rem; font-size: 0.85rem; color: var(--text-muted); }
    .footer a { color: var(--accent); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Device Providers – Support Cases</h1>
      <p>Reporte generado desde Notion para presentación a personas externas.</p>
      <div class="stats">
        <span>Total: <strong>${cases.length}</strong> casos</span>
      </div>
    </header>
    <div class="grid">
${cardsHtml}
    </div>
    <footer class="footer">
      FX NetOps Team 2026 · <a href="mailto:noc@fiberx.net">noc@fiberx.net</a> · <a href="https://fiberx.net" target="_blank" rel="noopener">fiberx.net</a>
    </footer>
  </div>
</body>
</html>`;
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

  const sorted = sortCases(cases);

  await mkdir(CASES_DIR, { recursive: true });

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const fileSlug = slug(c.caseName);
    const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.md`;
    const path = join(CASES_DIR, filename);
    await writeFile(path, caseToMarkdown(c, i + 1), "utf8");
    console.log("  ", filename);
  }

  const readmePath = join(ROOT, "README.md");
  await writeFile(readmePath, buildReadme(sorted), "utf8");
  console.log("README.md actualizado.");

  const htmlPath = join(ROOT, "index.html");
  await writeFile(htmlPath, buildHtml(sorted), "utf8");
  console.log("index.html actualizado (vista web con fichas y tiempo).");

  console.log(`\nListo: ${sorted.length} casos en cases/, README.md e index.html. Abre index.html en el navegador para ver el reporte visual.`);
}

main();
