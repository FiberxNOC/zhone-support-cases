/**
 * Utilidades para generar el reporte (REPORT.md, index.html, cases/*.html) desde data/cases.json.
 * Soporta idioma: lang "es" (español) o "en" (inglés).
 */

/** Textos de UI por idioma (es / en). */
const I18N = {
  es: {
    reportTitle: "Device Providers – Support Cases",
    reportSubtitle: "Reporte generado desde **data/cases.json** (sincronizado con Notion), para presentación a personas externas.",
    summary: "Resumen",
    totalCases: "Total de casos",
    indexTable: "Índice de casos (tabla)",
    caseName: "Case Name",
    provider: "Provider",
    caseNumber: "Case #",
    status: "Status",
    affectation: "Affectation",
    created: "Created",
    backToReport: "Volver al reporte",
    viewDetail: "Ver detalle",
    state: "Estado",
    affectationLabel: "Afectación",
    all: "Todos",
    allFem: "Todas",
    clearFilters: "Quitar",
    filters: "Filtros",
    whatToShow: "Qué mostrar",
    propertiesLoaded: "Propiedades cargadas en este caso",
    identification: "Identification",
    dates: "Dates",
    classification: "Classification",
    device: "Device",
    other: "Other",
    summarySection: "Resumen",
    notesSection: "Notas",
    problemDetail: "Detalle del problema",
    resolution: "Resolución",
    caseContent: "Contenido del caso",
    viewInNotion: "Ver en Notion",
    createdLabel: "Created",
    dueLabel: "Due",
    teamFooter: "FiberX NetOps Team · 2026",
    tocTitle: "Índice",
    casesSummary: "Resumen de casos",
    generalDetails: "Detalles generales",
    reportGenerated: "Reporte generado en",
    totalCasesCount: "Total",
    cases: "casos",
    reportOfCases: "Reporte de casos",
    disclaimer: "Este documento contiene información confidencial de FiberX y está destinado únicamente a los destinatarios autorizados. Su distribución, reproducción o uso no autorizado está prohibida. La información aquí incluida no puede ser divulgada a terceros sin autorización previa por escrito.",
    docScope: "Este documento es un reporte de casos de soporte de Device Providers, generado a partir de la base de datos del equipo de soporte de FiberX, y muestra el estado de todos los casos abiertos y cerrados. El objetivo es generar visibilidad del estado de cada caso y permitir acceder al detalle completo (resumen, problema, resolución y notas).",
    switchThemeLight: "Cambiar a modo claro",
    switchThemeDark: "Cambiar a modo oscuro",
    langSwitchToEn: "English",
    langSwitchToEs: "Español",
    scrollTop: "Subir",
    goToSite: "FiberX – Ir al sitio oficial",
    showFilters: "Mostrar u ocultar filtros",
    showColumns: "Mostrar u ocultar opciones de columnas",
    ticketView: "Ver ticket en la plataforma",
    showing: "Mostrando",
    of: "de",
    badges: "Badges",
    caseAndDate: "Case & fecha",
    time: "Tiempo",
    actions: "Acciones",
    confidential: "FiberX NetOps Team | Información confidencial",
    page: "Página",
    ofPages: "de",
    closedSameDay: "Cerrado el mismo día",
    closedInDays: "Cerrado en {n} día(s)",
    openToday: "Abierto hoy",
    openForDays: "Abierto desde hace {n} día(s)",
    dueInDays: "Vence en {n} día(s)",
    dueToday: "Vence hoy",
    overdueBy: "Vencido hace {n} día(s)",
  },
  en: {
    reportTitle: "Device Providers – Support Cases",
    reportSubtitle: "Report generated from **data/cases.json** (synced with Notion), for external presentation.",
    summary: "Summary",
    totalCases: "Total cases",
    indexTable: "Cases index (table)",
    caseName: "Case Name",
    provider: "Provider",
    caseNumber: "Case #",
    status: "Status",
    affectation: "Affectation",
    created: "Created",
    backToReport: "Back to report",
    viewDetail: "View detail",
    state: "Status",
    affectationLabel: "Affectation",
    all: "All",
    allFem: "All",
    clearFilters: "Clear",
    filters: "Filters",
    whatToShow: "What to show",
    propertiesLoaded: "Properties loaded for this case",
    identification: "Identification",
    dates: "Dates",
    classification: "Classification",
    device: "Device",
    other: "Other",
    summarySection: "Summary",
    notesSection: "Notes",
    problemDetail: "Problem detail",
    resolution: "Resolution",
    caseContent: "Case content",
    viewInNotion: "View in Notion",
    createdLabel: "Created",
    dueLabel: "Due",
    teamFooter: "FiberX NetOps Team · 2026",
    tocTitle: "Table of contents",
    casesSummary: "Cases summary",
    generalDetails: "General details",
    reportGenerated: "Report generated",
    totalCasesCount: "Total",
    cases: "cases",
    reportOfCases: "Cases report",
    disclaimer: "This document contains confidential information of FiberX and is intended only for authorized recipients. Its distribution, reproduction or unauthorized use is prohibited. The information contained herein may not be disclosed to third parties without prior written authorization.",
    docScope: "This document is a Device Providers support cases report, generated from FiberX support team database, and shows the status of all open and closed cases. The goal is to provide visibility of each case status and allow access to full detail (summary, problem, resolution and notes).",
    switchThemeLight: "Switch to light mode",
    switchThemeDark: "Switch to dark mode",
    langSwitchToEn: "English",
    langSwitchToEs: "Español",
    scrollTop: "Scroll up",
    goToSite: "FiberX – Go to official site",
    showFilters: "Show or hide filters",
    showColumns: "Show or hide column options",
    ticketView: "View ticket in platform",
    showing: "Showing",
    of: "of",
    badges: "Badges",
    caseAndDate: "Case & date",
    time: "Time",
    actions: "Actions",
    confidential: "FiberX NetOps Team | Confidential information",
    page: "Page",
    ofPages: "of",
    closedSameDay: "Closed same day",
    closedInDays: "Closed in {n} day(s)",
    openToday: "Open today",
    openForDays: "Open for {n} day(s)",
    dueInDays: "Due in {n} day(s)",
    dueToday: "Due today",
    overdueBy: "Overdue by {n} day(s)",
  },
};

function t(lang, key) {
  const L = I18N[lang] || I18N.es;
  return L[key] ?? I18N.es[key] ?? key;
}

const STATUS_ORDER = [
  "Not started",
  "In progress",
  "Escalated to En...",
  "Escalated to Engineering",
  "Fix Scheduled",
  "Done",
];
const AFECTATION_ORDER = ["Critical 🔥", "High 🚨", "Normal", "Low"];

/** URL base del visor de tickets (plataforma interna FiberX). ticket_id se concatena. */
const TICKET_VIEW_URL_BASE = "https://billing.gofiberx.com/admin/supportmgr/ticket_view.php?ticket_id=";

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

/** Nombre de archivo para un caso: Case Number (ej. 562894.html) o fallback case-01.html */
function getCaseFilename(c, i, usedSet = null) {
  const base = c.caseNumber ? String(c.caseNumber).replace(/[^a-zA-Z0-9-_]/g, "") : null;
  const fallback = `case-${String(i + 1).padStart(2, "0")}`;
  let name = (base || fallback) + ".html";
  if (usedSet) {
    let n = 1;
    while (usedSet.has(name)) {
      name = (base || fallback) + "-" + (++n) + ".html";
    }
    usedSet.add(name);
  }
  return name;
}

function sortCases(cases) {
  return [...cases].sort((a, b) => {
    const statusA = STATUS_ORDER.indexOf(a.status) ?? STATUS_ORDER.length;
    const statusB = STATUS_ORDER.indexOf(b.status) ?? STATUS_ORDER.length;
    if (statusA !== statusB) return statusA - statusB;
    const afectA = AFECTATION_ORDER.indexOf(a.afectation) ?? AFECTATION_ORDER.length;
    const afectB = AFECTATION_ORDER.indexOf(b.afectation) ?? AFECTATION_ORDER.length;
    if (afectA !== afectB) return afectA - afectB;
    const dateA = a.createdDate || "";
    const dateB = b.createdDate || "";
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    // Desempate estable: por nombre y luego por id
    const nameCmp = (a.caseName || "").localeCompare(b.caseName || "");
    if (nameCmp !== 0) return nameCmp;
    return (a.id || "").localeCompare(b.id || "");
  });
}

/** Nombres posibles de propiedades en Notion → nuestra clave interna (platform, model, fw).
 * Si en Notion la prop se llama distinto (ej. "Model." con punto), añadirla aquí. */
const NOTION_PROP_ALIASES = {
  platform: ["Platform", "Patform", "Plataforma"],
  model: ["Model", "Model.", "Modelo"],
  fw: ["Firmware Version", "Firmware", "FW"],
};

/** Devuelve el primer valor no vacío de allProps para una de las claves alias.
 * Compara claves normalizadas (trim + lowercase) para encontrar la prop aunque en Notion se llame "Platform ", "Model.", "Plataforma", etc. */
function getFromAllPropsByAliases(allProps, ...internalKeys) {
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

/** Obtiene el primer valor de allProps cuya clave coincida con algún patrón.
 * Coincide: igual (case insensitive) o clave que empiece por patrón + espacio (ej. "Firmware Version" con patrón "firmware"). */
function getFromAllProps(allProps, ...keyPatterns) {
  if (!allProps || typeof allProps !== "object") return null;
  for (const pattern of keyPatterns) {
    const p = typeof pattern === "string" ? String(pattern).toLowerCase().trim() : null;
    if (!p) continue;
    for (const [key, value] of Object.entries(allProps)) {
      if (value == null || String(value).trim() === "") continue;
      const k = String(key ?? "").trim().toLowerCase();
      if (!k) continue;
      const match = k === p || k.startsWith(p + " ");
      if (match) return String(value).trim();
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

function computeTimeInfo(c, lang = "es") {
  const now = new Date();
  const created = c.createdDate ? new Date(c.createdDate) : null;
  const due = c.dueDate ? new Date(c.dueDate) : null;
  const lastEdit = c.lastEditedTime ? new Date(c.lastEditedTime) : null;
  const isDone = /done|cerrado/i.test(String(c.status || ""));
  const msPerDay = 24 * 60 * 60 * 1000;
  let daysOpen = null;
  let label = "";
  let subLabel = "";
  const replaceN = (str, n) => str.replace(/\{n\}/g, String(n));
  const pluralDay = (n, isEs) => (n !== 1 ? (isEs ? "días" : "days") : isEs ? "día" : "day");
  const replacePlural = (str, n) => str.replace(/day\(s\)/g, pluralDay(n, false)).replace(/día\(s\)/g, pluralDay(n, true));
  if (created) {
    const endDate = isDone && lastEdit ? lastEdit : now;
    daysOpen = Math.floor((endDate - created) / msPerDay);
    if (isDone) {
      label = daysOpen <= 0 ? t(lang, "closedSameDay") : replacePlural(replaceN(t(lang, "closedInDays"), daysOpen), daysOpen);
    } else {
      label = daysOpen <= 0 ? t(lang, "openToday") : replacePlural(replaceN(t(lang, "openForDays"), daysOpen), daysOpen);
    }
  }
  if (due && !isDone) {
    const daysUntilDue = Math.floor((due - now) / msPerDay);
    if (daysUntilDue > 0) subLabel = replacePlural(replaceN(t(lang, "dueInDays"), daysUntilDue), daysUntilDue);
    else if (daysUntilDue === 0) subLabel = t(lang, "dueToday");
    else subLabel = replacePlural(replaceN(t(lang, "overdueBy"), Math.abs(daysUntilDue)), Math.abs(daysUntilDue));
  }
  return { daysOpen, label, subLabel };
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convierte un segmento de texto (sin ''' código ''') en HTML: párrafos y citas (> ). */
function textSegmentToHtml(segment) {
  if (!segment || !segment.trim()) return "";
  const blocks = segment.trim().split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const allQuoted = lines.every((line) => /^\s*>/.test(line));
      if (allQuoted && lines.length >= 1) {
        const quotedHtml = lines
          .map((line) => escapeHtml(line.replace(/^\s*>\s?/, "").trim()))
          .filter((s) => s)
          .join("<br>");
        if (quotedHtml) return `<blockquote class="detail-quote">${quotedHtml}</blockquote>`;
      }
      return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

/** Formatea texto plano a HTML. Código solo con marcado explícito: ''' código '''. Resto: párrafos y citas (> ). */
function textToHtml(str) {
  if (!str || !String(str).trim()) return "";
  const s = String(str).trim();
  const out = [];
  let rest = s;
  while (rest.length > 0) {
    const open = rest.indexOf("'''");
    if (open === -1) {
      out.push(textSegmentToHtml(rest));
      break;
    }
    if (open > 0) {
      out.push(textSegmentToHtml(rest.slice(0, open)));
    }
    rest = rest.slice(open + 3);
    const close = rest.indexOf("'''");
    if (close === -1) {
      out.push(textSegmentToHtml(rest));
      break;
    }
    const code = rest.slice(0, close).trim();
    out.push(`<pre class="detail-code">${escapeHtml(code)}</pre>`);
    rest = rest.slice(close + 3);
  }
  return out.join("");
}

/** Normaliza nombre de prop para comparación (trim + lowercase). */
function normPropName(s) {
  return String(s ?? "").trim().toLowerCase();
}

/** Añade al objeto de props los campos de nivel caso (provider, model, device, etc.) con nombres canónicos,
 *  para que siempre se muestren en el detalle aunque no estén en allProps (p. ej. inferidos o con otro nombre en Notion).
 *  También normaliza claves de allProps (ej. "platform" → "Platform") para que Platform/sdNOS etc. siempre salgan. */
function enrichAllPropsWithCase(c) {
  const merged = { ...(c.allProps || {}) };
  const set = (key, value) => {
    if (value != null && String(value).trim() !== "") merged[key] = value;
  };
  set("Provider", c.provider);
  set("Model", c.model);
  set("Device", c.device);
  set("Serial Number", c.serialNumber);
  set("Firmware Version", c.firmwareVersion);
  set("Platform", c.platform);
  /* Si Platform no está pero allProps trae la prop con otro nombre (platform, PLATFORM, etc.), usar ese valor */
  if (!merged["Platform"] || !String(merged["Platform"]).trim()) {
    for (const [k, v] of Object.entries(merged)) {
      if (normPropName(k || "") === "platform" && v != null && String(v).trim() !== "") {
        merged["Platform"] = v;
        break;
      }
    }
  }
  return merged;
}

/** Claves normalizadas por grupo: Identification, Dates, Classification, Device. Cualquier otra → Other.
 *  Incluye todas las props de la DB Notion: No, Provider, Case Number, Created/Due Date, Failure Type, Affectation,
 *  Internal Ticket, Device, Model, Firmware Version, Created by, Last edited by, Platform, Serial Number. */
const PROP_GROUP_KEYS = {
  id: ["no", "nº", "number", "case number", "internal ticket", "internal ticket number", "ticket", "ticket number"],
  fechas: ["created date", "created", "due date", "due"],
  clasif: ["afectation", "affectation", "failure type", "provider", "classification", "type"],
  dispositivo: ["device", "model", "model.", "modelo", "serial number", "firmware version", "firmware", "firmwareversion", "fw", "platform", "patform", "plataforma", "version"],
};

function groupProps(allProps) {
  const id = [], fechas = [], clasif = [], dispositivo = [], otros = [];
  for (const [name, value] of Object.entries(allProps || {})) {
    if (value == null || !String(value).trim()) continue;
    /* Notion a veces trae la prop "No" (número de fila) con nombre vacío; la mostramos como "No" en Identification */
    const displayName = name && String(name).trim() ? name : "No";
    const nameNorm = normPropName(displayName);
    if (nameNorm === "case name" || nameNorm === "name") continue; /* ya es el título del caso */
    if (nameNorm === "status") continue; /* Status se muestra como badge en el hero */
    const v = escapeHtml(String(value)).replace(/\n/g, "<br>");
    const isInternalTicket =
      nameNorm === "internal ticket" || nameNorm === "internal ticket number" || nameNorm === "ticket number";
    const valueCell =
      isInternalTicket
        ? `<span class="prop-value"><a href="${TICKET_VIEW_URL_BASE}${encodeURIComponent(String(value).trim())}" target="_blank" rel="noopener" class="prop-value-link">${v}</a></span>`
        : `<span class="prop-value">${v}</span>`;
    const row = `<div class="prop-row"><span class="prop-label">${escapeHtml(displayName)}</span>${valueCell}</div>`;
    if (PROP_GROUP_KEYS.id.some((k) => nameNorm === k)) id.push(row);
    else if (PROP_GROUP_KEYS.fechas.some((k) => nameNorm === k)) fechas.push(row);
    else if (PROP_GROUP_KEYS.clasif.some((k) => nameNorm === k)) clasif.push(row);
    else if (PROP_GROUP_KEYS.dispositivo.some((k) => nameNorm === k)) dispositivo.push(row);
    else otros.push(row); /* Last edited by, Created by, y cualquier otra prop de Notion */
  }
  return { id, fechas, clasif, dispositivo, otros };
}

/** Props del caso para PDF: cortos (hasta 4 por fila), largos en fila completa. */
function buildPdfPropsTable(allProps) {
  if (!allProps || typeof allProps !== "object") return "";
  const SHORT_LEN = 38;
  const COLS = 4;
  const items = [];
  for (const [name, value] of Object.entries(allProps)) {
    if (value == null || !String(value).trim()) continue;
    if (!name || !String(name).trim()) continue;
    if (name === "Case Name" || name === "Status") continue;
    const valStr = String(value).trim();
    const short = valStr.length <= SHORT_LEN && !valStr.includes("\n");
    items.push({ name: escapeHtml(name), value: escapeHtml(valStr).replace(/\n/g, "<br>"), short });
  }
  if (items.length === 0) return "";
  const rows = [];
  let row = [];
  for (const item of items) {
    if (item.short && row.length < COLS) {
      row.push(`<td class="props-cell">${item.name}: ${item.value}</td>`);
      continue;
    }
    if (row.length) {
      rows.push(`<tr>${row.join("")}</tr>`);
      row = [];
    }
    if (item.short) {
      row.push(`<td class="props-cell">${item.name}: ${item.value}</td>`);
    } else {
      rows.push(`<tr><td class="props-cell props-cell-full" colspan="${COLS}">${item.name}: ${item.value}</td></tr>`);
    }
  }
  if (row.length) rows.push(`<tr>${row.concat(Array(COLS - row.length).fill("<td class=\"props-cell\"></td>")).join("")}</tr>`);
  return `<table class="props-table"><tbody>${rows.join("")}</tbody></table>`;
}

function caseToMarkdown(c, index) {
  const lines = [`# ${index}. ${c.caseName}`, "", "| Campo | Valor |", "|------|-------|"];
  for (const [name, value] of Object.entries(c.allProps || {})) {
    const str = value == null ? "" : String(value);
    if (str) lines.push(`| ${name} | ${str.replace(/\n/g, " ")} |`);
  }
  if (c.resumen) { lines.push("", "## Resumen", "", c.resumen, ""); }
  if (c.detalleDelProblema) { lines.push("", "## Detalle del problema", "", c.detalleDelProblema, ""); }
  if (c.resolucion) { lines.push("", "## Resolución", "", c.resolucion, ""); }
  if (c.notas) { lines.push("", "## Notas", "", c.notas, ""); }
  lines.push("", `[Ver en Notion](${c.notionUrl})`, "");
  return lines.join("\n");
}

function buildReadme(cases, filenames = null, lang = "es") {
  const used = new Set();
  const casesDir = lang === "en" ? "cases-en" : "cases";
  const getFilename = (c, i) => filenames ? filenames[i] : getCaseFilename(c, i, used);
  const lines = [
    `# ${t(lang, "reportTitle")}`,
    "",
    t(lang, "reportSubtitle"),
    "",
    `## ${t(lang, "summary")}`,
    "",
    `${t(lang, "totalCases")}: **${cases.length}**. ${lang === "es" ? "Enlaces directos a cada caso:" : "Direct links to each case:"}`,
    "",
  ];
  cases.forEach((c, i) => {
    const filename = getFilename(c, i);
    const shortTitle = c.caseName.length > 70 ? c.caseName.slice(0, 70) + "…" : c.caseName;
    lines.push(`- [**${i + 1}.** ${shortTitle}](${casesDir}/${filename}) — ${c.status || "—"} · ${c.afectation || "—"}`);
  });
  lines.push("", "---", "", `## ${t(lang, "indexTable")}`, "",
    `| # | ${t(lang, "caseName")} | ${t(lang, "provider")} | ${t(lang, "caseNumber")} | ${t(lang, "status")} | ${t(lang, "affectation")} | ${t(lang, "created")} |`,
    "|---|-----------|----------|--------|--------|-------------|--------|",
  );
  cases.forEach((c, i) => {
    const filename = getFilename(c, i);
    const link = `[${c.caseName.slice(0, 50)}${c.caseName.length > 50 ? "…" : ""}](${casesDir}/${filename})`;
    lines.push(`| ${i + 1} | ${link} | ${c.provider || "—"} | ${c.caseNumber || "—"} | ${c.status || "—"} | ${c.afectation || "—"} | ${c.createdDate || "—"} |`);
  });
  lines.push("", "---", "", `*${t(lang, "teamFooter")}*`, "");
  return lines.join("\n");
}

function buildCaseDetailHtml(c, index, lang = "es") {
  const time = computeTimeInfo(c, lang);
  const statusColors = { Done: "#64748b", "Fix Scheduled": "#94a3b8", "In progress": "#2563eb", "Not started": "#94a3b8", "Escalated to En...": "#64748b", "Escalated to Engineering": "#64748b" };
  const afectacionColors = { "Critical 🔥": "#475569", "High 🚨": "#64748b", Normal: "#94a3b8", Low: "#cbd5e1" };
  const statusColor = statusColors[c.status] || "#6b7280";
  const statusIsOpen = ["In progress", "Not started", "Escalated to Engineering", "Escalated to En..."].includes(c.status);
  const afectColor = afectacionColors[c.afectation] || "#6b7280";
  const propsForDetail = enrichAllPropsWithCase(c);
  const groups = groupProps(propsForDetail);
  const loadedPropEntries = Object.entries(propsForDetail).filter(
    ([k, v]) => v != null && String(v).trim() !== "" && normPropName(k || "") !== "case name" && normPropName(k || "") !== "name" && normPropName(k || "") !== "status"
  );
  const loadedPropLabels = loadedPropEntries.map(([k]) => (k && String(k).trim() ? k : "No")).sort((a, b) => a.localeCompare(b));
  const propsLoadedHtml =
    loadedPropLabels.length > 0
      ? `<div class="props-loaded-info" role="status"><span class="props-loaded-title">${t(lang, "propertiesLoaded")} (${loadedPropLabels.length}):</span> <span class="props-loaded-list">${escapeHtml(loadedPropLabels.join(", "))}</span></div>`
      : "";
  const dueWarning =
    c.dueDate && c.createdDate && new Date(c.dueDate) < new Date(c.createdDate)
      ? '<span class="due-warning">Overdue</span>'
      : time.subLabel ? `<span class="due-info">${escapeHtml(time.subLabel)}</span>` : "";
  const propBlock = (title, rows) =>
    rows.length ? `<div class="prop-group"><h3 class="prop-group-title">${escapeHtml(title)}</h3><div class="prop-list">${rows.join("")}</div></div>` : "";
  const resumenSection = c.resumen ? `<section class="detail-section"><h2 class="section-title">${t(lang, "summarySection")}</h2><div class="detail-content">${textToHtml(c.resumen)}</div></section>` : "";
  const notasSection = c.notas ? `<section class="detail-section"><h2 class="section-title">${t(lang, "notesSection")}</h2><div class="detail-content">${textToHtml(c.notas)}</div></section>` : "";
  const resumenNotasRow = resumenSection || notasSection ? `<div class="detail-row-2">${resumenSection}${notasSection}</div>` : "";
  const sections = [];
  if (c.detalleDelProblema) sections.push(`<section class="detail-section"><h2 class="section-title">${t(lang, "problemDetail")}</h2><div class="detail-content">${textToHtml(c.detalleDelProblema)}</div></section>`);
  if (c.resolucion) sections.push(`<section class="detail-section"><h2 class="section-title">${t(lang, "resolution")}</h2><div class="detail-content">${textToHtml(c.resolucion)}</div></section>`);

  const indexLink = lang === "en" ? "../index.html#en" : "../index.html";
  const caseLogoImg = '<img src="../assets/logoheader-1.svg" alt="FiberX" class="logo-icon logo-icon-dark" width="168" height="52" loading="lazy" /><img src="../assets/logoheader-light.svg" alt="FiberX" class="logo-icon logo-icon-light" width="168" height="52" loading="lazy" />';
  const themeLabel = lang === "es" ? "Cambiar a modo claro" : "Switch to light mode";
  const themeLabelDark = lang === "es" ? "Cambiar a modo oscuro" : "Switch to dark mode";
  return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${index}. ${escapeHtml(c.caseName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="../styles/report.css">
</head>
<body class="report-case">
  <script>
  (function(){var k='report-theme';var s=document.documentElement.getAttribute('data-theme')||localStorage.getItem(k)||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);})();
  </script>
  <div class="container">
    <header class="top-bar" role="banner">
      <a href="${indexLink}" class="logo" aria-label="${t(lang, "backToReport")}">${caseLogoImg}</a>
      <a href="${indexLink}" class="back-link">← ${t(lang, "backToReport")}</a>
      <button type="button" id="theme-toggle" class="theme-toggle theme-btn" aria-label="${t(lang, "switchThemeLight")}" title="${t(lang, "switchThemeLight")}"><i class="fa-solid fa-sun theme-btn-icon" aria-hidden="true"></i></button>
    </header>
    <div class="case-details">
      <header class="case-hero">
        <div class="case-hero-top">
          <div class="case-hero-top-left">
            ${c.caseNumber ? `<span class="case-num">Case #${escapeHtml(c.caseNumber)}</span>` : ""}
            ${c.internalTicket ? `<a href="${TICKET_VIEW_URL_BASE}${encodeURIComponent(String(c.internalTicket))}" target="_blank" rel="noopener" class="case-num ticket-link" title="${t(lang, "ticketView")}">Ticket ${escapeHtml(c.internalTicket)}</a>` : ""}
            ${c.provider ? `<span class="badge" style="--badge-color:#6366f1">${escapeHtml(c.provider)}</span>` : ""}
            ${c.afectation ? `<span class="badge" style="--badge-color:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
          </div>
          ${c.status ? `<span class="badge status-badge-hero ${statusIsOpen ? "status-badge--open" : "status-badge--done"}" style="--badge-color:${statusColor}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(c.status)}</span>` : ""}
        </div>
        <h1 class="case-title">${escapeHtml(c.caseName)}</h1>
        <div class="key-info">
          ${time.label ? `<span class="key-info-item"><strong>${escapeHtml(time.label)}</strong></span>` : ""}
          ${c.createdDate ? `<span class="key-info-item">${t(lang, "createdLabel")}: ${escapeHtml(c.createdDate)}</span>` : ""}
          ${c.dueDate ? `<span class="key-info-item">${t(lang, "dueLabel")}: ${escapeHtml(c.dueDate)}</span>` : ""}
          ${dueWarning ? `<span class="key-info-item">${dueWarning}</span>` : ""}
        </div>
      </header>
      <div class="props-grid">
        ${propBlock(t(lang, "identification"), groups.id)}
        ${propBlock(t(lang, "dates"), groups.fechas)}
        ${propBlock(t(lang, "classification"), groups.clasif)}
        ${propBlock(t(lang, "device"), groups.dispositivo)}
        ${propBlock(t(lang, "other"), groups.otros)}
      </div>
      ${propsLoadedHtml}
    </div>
    <div class="case-body">
      <div class="content-divider">${t(lang, "caseContent")}</div>
      ${resumenNotasRow}
      ${sections.join("")}
    </div>
    <div class="footer-wrap">
      <footer class="footer">
        <a href="${escapeHtml(c.notionUrl)}" target="_blank" rel="noopener">${t(lang, "viewInNotion")} →</a><br>
        ${t(lang, "teamFooter")}
      </footer>
    </div>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;var icon=b.querySelector('.theme-btn-icon');var lightL="${escapeHtml(t(lang, "switchThemeLight"))}";var darkL="${escapeHtml(t(lang, "switchThemeDark"))}";function u(){var s=document.documentElement.getAttribute('data-theme');var isDark=s==='dark';b.setAttribute('aria-label',isDark?lightL:darkL);b.setAttribute('title',isDark?lightL:darkL);if(icon){icon.className='theme-btn-icon fa-solid '+(isDark?'fa-sun':'fa-moon');}}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
  <button type="button" id="scroll-top-btn" class="scroll-top-btn" aria-label="${t(lang, "scrollTop")}" title="${t(lang, "scrollTop")}"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>
  <script>
  (function(){var btn=document.getElementById('scroll-top-btn');if(!btn)return;function onScroll(){btn.classList.toggle('is-visible',(window.scrollY||document.documentElement.scrollTop)>400);}window.addEventListener('scroll',onScroll,{passive:true});onScroll();btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});})();
  </script>
</body>
</html>`;
}

/** Construye el fragmento de contenido del index (header + filtros + grid) con IDs sufijados para un solo index bilingüe. */
function buildIndexContentFragment(cases, filenames, lang, suffix) {
  const used = new Set();
  const casesDir = lang === "en" ? "cases-en" : "cases";
  const getFilename = (c, i) => filenames ? filenames[i] : getCaseFilename(c, i, used);
  const timeInfos = cases.map((c) => computeTimeInfo(c, lang));
  const statusColors = { Done: "#64748b", "Fix Scheduled": "#94a3b8", "In progress": "#2563eb", "Not started": "#94a3b8", "Escalated to En...": "#64748b", "Escalated to Engineering": "#64748b" };
  const afectacionColors = { "Critical 🔥": "#475569", "High 🚨": "#64748b", Normal: "#94a3b8", Low: "#cbd5e1" };
  const statuses = [...new Set(cases.map((c) => c.status).filter(Boolean))].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a);
    const ib = STATUS_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const afectations = [...new Set(cases.map((c) => c.afectation).filter(Boolean))].sort((a, b) => {
    const ia = AFECTATION_ORDER.indexOf(a);
    const ib = AFECTATION_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const providers = [...new Set(cases.map((c) => c.provider).filter(Boolean))].sort();
  const resolved = cases.map((c) => {
    const allProps = c.allProps || {};
    return {
      platform: getFromAllPropsByAliases(allProps, "platform") ?? getFromAllProps(allProps, "platform", "patform", "plataforma") ?? (c.platform ?? ""),
      model: getFromAllPropsByAliases(allProps, "model") ?? getFromAllProps(allProps, "model", "modelo") ?? (c.model ?? ""),
      fw: getFromAllPropsByAliases(allProps, "fw") ?? getFromAllProps(allProps, "firmware version", "firmware", "fw") ?? (c.firmwareVersion ?? ""),
    };
  });
  const platforms = [...new Set(resolved.map((r) => r.platform).filter(Boolean))].sort();
  const models = [...new Set(resolved.map((r) => r.model).filter(Boolean))].sort();
  const firmwares = [...new Set(resolved.map((r) => r.fw).filter(Boolean))].sort();
  const filterStatusOptions = statuses.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  const filterAfectOptions = afectations.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
  const filterProviderOptions = providers.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  const filterPlatformOptions = platforms.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  const filterModelOptions = models.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  const filterFirmwareOptions = firmwares.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
  const cardsHtml = cases.map((c, i) => {
    const time = timeInfos[i];
    const htmlFilename = getFilename(c, i);
    const statusColor = statusColors[c.status] || "#6b7280";
    const statusIsOpen = ["In progress", "Not started", "Escalated to Engineering", "Escalated to En..."].includes(c.status);
    const afectColor = afectacionColors[c.afectation] || "#6b7280";
    const platform = resolved[i].platform;
    const model = resolved[i].model;
    const fw = resolved[i].fw;
    const statusVal = c.status || "";
    const spec = (propKey, label, value) => `<span class="card-spec-item" data-card-prop="${escapeHtml(propKey)}"><span class="card-spec-label">${escapeHtml(label)}</span><span class="card-spec-value${value ? "" : " card-spec-empty"}">${value ? escapeHtml(String(value)) : "—"}</span></span>`;
    return `
    <article class="card" data-status="${escapeHtml(statusVal)}" data-afectation="${escapeHtml(c.afectation || "")}" data-provider="${escapeHtml(c.provider || "")}" data-platform="${escapeHtml(platform)}" data-model="${escapeHtml(model)}" data-firmware="${escapeHtml(fw)}" style="--card-accent:${statusColor}">
      <div class="card-header">
        <div class="badges" data-card-prop="badges">
          ${c.status ? `<span class="badge badge-status ${statusIsOpen ? "status-badge--open" : "status-badge--done"}" style="--badge-color:${statusColor}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(c.status)}</span>` : ""}
          ${c.provider ? `<span class="badge badge-provider">${escapeHtml(c.provider)}</span>` : ""}
          ${c.afectation ? `<span class="badge badge-afect" style="--badge-color:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
        </div>
      </div>
      <h2 class="card-title"><a href="${casesDir}/${htmlFilename}" title="${escapeHtml(c.caseName)}">${escapeHtml(c.caseName)}</a></h2>
      <div class="card-meta" data-card-prop="cardMeta">
        ${c.caseNumber ? `<span>Case <strong>${escapeHtml(c.caseNumber)}</strong></span>` : ""}
        ${c.createdDate ? `<span>${escapeHtml(c.createdDate)}</span>` : ""}
      </div>
      <div class="card-specs">
        ${spec("status", "Status", statusVal)}
        ${spec("platform", "Platform", platform)}
        ${spec("model", "Model", model)}
        ${spec("firmware", "FW", fw)}
      </div>
      <div class="card-time" data-card-prop="time">
        ${time.label ? `<span class="time-label">${escapeHtml(time.label)}</span>` : ""}
        ${time.subLabel ? `<span class="time-sublabel">${escapeHtml(time.subLabel)}</span>` : ""}
      </div>
      <div class="card-actions" data-card-prop="actions">
        <a href="${casesDir}/${htmlFilename}" class="btn btn-secondary">${t(lang, "viewDetail")}</a>
      </div>
    </article>`;
  }).join("");

  const allOpt = lang === "es" ? "Todos" : "All";
  const allFemOpt = lang === "es" ? "Todas" : "All";
  const s = suffix;
  return `
    <header>
      <h1>${t(lang, "reportTitle")}</h1>
      <p>${t(lang, "reportSubtitle").replace(/\*\*/g, "")}</p>
      <div class="stats"><span>${t(lang, "totalCasesCount")}: <strong>${cases.length}</strong> ${t(lang, "cases")}</span><span id="filter-count-${s}" class="filter-count"></span></div>
    </header>
    <div class="toolbar-row">
    <div class="filters-wrap">
      <button type="button" id="filter-toggle-${s}" class="filter-toggle" aria-expanded="false" aria-controls="filter-panel-${s}" aria-label="${t(lang, "showFilters")}">
        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
        <span>${t(lang, "filters")}</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="filter-panel-${s}" class="filter-panel" role="region" aria-label="${t(lang, "filters")}">
        <div class="filters">
          <div class="filter-group">
            <label for="filter-status-${s}"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${t(lang, "state")}</label>
            <select id="filter-status-${s}" class="filter-select" aria-label="${t(lang, "state")}">
              <option value="">${allOpt}</option>${filterStatusOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-afectation-${s}"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${t(lang, "affectationLabel")}</label>
            <select id="filter-afectation-${s}" class="filter-select" aria-label="${t(lang, "affectationLabel")}">
              <option value="">${allFemOpt}</option>${filterAfectOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-provider-${s}"><i class="fa-solid fa-building" aria-hidden="true"></i> ${t(lang, "provider")}</label>
            <select id="filter-provider-${s}" class="filter-select" aria-label="${t(lang, "provider")}">
              <option value="">${allOpt}</option>${filterProviderOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-platform-${s}"><i class="fa-solid fa-server" aria-hidden="true"></i> Platform</label>
            <select id="filter-platform-${s}" class="filter-select" aria-label="Platform">
              <option value="">${allFemOpt}</option>${filterPlatformOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-model-${s}"><i class="fa-solid fa-cube" aria-hidden="true"></i> Model</label>
            <select id="filter-model-${s}" class="filter-select" aria-label="Model">
              <option value="">${allFemOpt}</option>${filterModelOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-firmware-${s}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i> FW</label>
            <select id="filter-firmware-${s}" class="filter-select" aria-label="FW">
              <option value="">${allFemOpt}</option>${filterFirmwareOptions}
            </select>
          </div>
          <button type="button" id="filter-clear-${s}" class="btn btn-filter-clear" aria-label="${t(lang, "clearFilters")}">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> ${t(lang, "clearFilters")}
          </button>
        </div>
      </div>
    </div>
    <div class="columns-wrap">
      <button type="button" id="columns-toggle-${s}" class="filter-toggle" aria-expanded="false" aria-controls="columns-panel-${s}" aria-label="${t(lang, "showColumns")}">
        <i class="fa-solid fa-table-columns" aria-hidden="true"></i>
        <span>${t(lang, "whatToShow")}</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="columns-panel-${s}" class="filter-panel" role="region" aria-label="${t(lang, "whatToShow")}">
        <div class="columns-options">
          <label class="column-option"><input type="checkbox" id="col-badges-${s}" data-card-prop="badges" data-suffix="${s}" checked> <span>${t(lang, "badges")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-cardMeta-${s}" data-card-prop="cardMeta" data-suffix="${s}" checked> <span>${t(lang, "caseAndDate")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-status-${s}" data-card-prop="status" data-suffix="${s}" checked> <span>${t(lang, "status")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-platform-${s}" data-card-prop="platform" data-suffix="${s}" checked> <span>Platform</span></label>
          <label class="column-option"><input type="checkbox" id="col-model-${s}" data-card-prop="model" data-suffix="${s}" checked> <span>Model</span></label>
          <label class="column-option"><input type="checkbox" id="col-firmware-${s}" data-card-prop="firmware" data-suffix="${s}" checked> <span>FW</span></label>
          <label class="column-option"><input type="checkbox" id="col-time-${s}" data-card-prop="time" data-suffix="${s}" checked> <span>${t(lang, "time")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-actions-${s}" data-card-prop="actions" data-suffix="${s}" checked> <span>${t(lang, "actions")}</span></label>
        </div>
      </div>
    </div>
    </div>
    <div class="grid" id="cases-grid-${s}">
${cardsHtml}
    </div>`;
}

/** Un solo index.html con paneles ES y (opcional) EN; el botón de idioma alterna y actualiza el hash (#en). */
function buildSingleIndexHtml(casesEs, filenamesEs, casesEn, filenamesEn) {
  const logoImg = `<img src="assets/logoheader-1.svg" alt="FiberX" class="logo-icon logo-icon-dark" width="168" height="52" loading="lazy" /><img src="assets/logoheader-light.svg" alt="FiberX" class="logo-icon logo-icon-light" width="168" height="52" loading="lazy" />`;
  const themeLabel = t("es", "switchThemeLight");
  const hasEn = casesEn && casesEn.length > 0 && filenamesEn && filenamesEn.length === casesEn.length;
  const fragmentEs = buildIndexContentFragment(casesEs, filenamesEs, "es", "es");
  const fragmentEn = hasEn ? buildIndexContentFragment(casesEn, filenamesEn, "en", "en") : "";
  const langSwitchHtml = hasEn
    ? '<button type="button" id="lang-switch-btn" class="lang-switch btn btn-secondary" aria-label="English">' + t("es", "langSwitchToEn") + '</button>'
    : "";
  const suffixes = hasEn ? ["es", "en"] : ["es"];
  const showingEs = t("es", "showing");
  const showingEn = t("en", "showing");
  const ofEs = t("es", "of");
  const ofEn = t("en", "of");
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t("es", "reportTitle")} | FiberX</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="styles/report.css">
</head>
<body class="report-index">
  <script>
  (function(){var k='report-theme';var s=document.documentElement.getAttribute('data-theme')||localStorage.getItem(k)||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);})();
  </script>
  <div class="container">
    <header class="top-bar" role="banner">
      <a href="https://gofiberx.com" class="logo" target="_blank" rel="noopener" aria-label="${t("es", "goToSite")}">${logoImg}</a>
      <div class="top-bar-actions">
        ${langSwitchHtml}
        <button type="button" id="theme-toggle" class="theme-toggle theme-btn" aria-label="${themeLabel}" title="${themeLabel}"><i class="fa-solid fa-sun theme-btn-icon" aria-hidden="true"></i></button>
      </div>
    </header>
    <main class="main-content">
    <div id="content-es" class="lang-panel">${fragmentEs}</div>
    ${hasEn ? `<div id="content-en" class="lang-panel" hidden>${fragmentEn}</div>` : ""}
    </main>
    <div class="footer-wrap">
      <footer class="footer">
        ${t("es", "teamFooter")}
      </footer>
    </div>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;var icon=b.querySelector('.theme-btn-icon');var lightL="${String(t("es", "switchThemeLight")).replace(/"/g, '\\"')}";var darkL="${String(t("es", "switchThemeDark")).replace(/"/g, '\\"')}";function u(){var s=document.documentElement.getAttribute('data-theme');var isDark=s==='dark';b.setAttribute('aria-label',isDark?lightL:darkL);b.setAttribute('title',isDark?lightL:darkL);if(icon){icon.className='theme-btn-icon fa-solid '+(isDark?'fa-sun':'fa-moon');}}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
  <script>
  (function(){
    var hasEn=${hasEn ? "true" : "false"};
    function getLang(){var h=window.location.hash;return (h==='#en'&&hasEn)?'en':'es';}
    function applyLang(){
      var lang=getLang();
      var esPanel=document.getElementById('content-es');var enPanel=document.getElementById('content-en');
      if(esPanel){esPanel.hidden=lang!=='es';}
      if(enPanel){enPanel.hidden=lang!=='en';}
      var btn=document.getElementById('lang-switch-btn');
      if(btn){btn.textContent=lang==='es'?${JSON.stringify(t("es", "langSwitchToEn"))}:${JSON.stringify(t("en", "langSwitchToEs"))};btn.setAttribute('aria-label',lang==='es'?${JSON.stringify(t("en", "langSwitchToEs"))}:${JSON.stringify(t("es", "langSwitchToEn"))});}
    if(hasEn){
      var btn=document.getElementById('lang-switch-btn');
      if(btn){btn.addEventListener('click',function(){var lang=getLang();window.location.hash=lang==='es'?'#en':'#';applyLang();});}
      window.addEventListener('hashchange',applyLang);
    }
    applyLang();
  })();
  </script>
  <script>
  (function(){
    var kProps='report-card-props';
    var defaultProps={badges:true,cardMeta:true,status:true,platform:true,model:true,firmware:true,time:true,actions:true};
    var suffixes=${JSON.stringify(suffixes)};
    suffixes.forEach(function(suf){
      var colsWrap=document.querySelector('#content-'+suf+' .columns-wrap');var colsToggle=document.getElementById('columns-toggle-'+suf);var colsPanel=document.getElementById('columns-panel-'+suf);
      if(!colsWrap||!colsToggle||!colsPanel)return;
      var colsCloseTimer=null;
      function showCols(){if(colsCloseTimer){clearTimeout(colsCloseTimer);colsCloseTimer=null;}colsWrap.classList.add('panel-open');colsPanel.classList.add('is-open');colsToggle.setAttribute('aria-expanded','true');}
      function hideCols(){colsCloseTimer=setTimeout(function(){colsWrap.classList.remove('panel-open');colsPanel.classList.remove('is-open');colsToggle.setAttribute('aria-expanded','false');colsCloseTimer=null;},220);}
      colsWrap.addEventListener('mouseenter',showCols);
      colsWrap.addEventListener('mouseleave',hideCols);
      function getVisibleProps(){try{var s=localStorage.getItem(kProps+'-'+suf);if(s){var o=JSON.parse(s);return Object.assign({},defaultProps,o);}}catch(e){}return defaultProps;}
      function setVisibleProps(o){localStorage.setItem(kProps+'-'+suf,JSON.stringify(o));}
      function applyColumnVisibility(){
        var vis=getVisibleProps();
        colsPanel.querySelectorAll('input[data-card-prop]').forEach(function(cb){cb.checked=vis[cb.dataset.cardProp]!==false;});
        var panel=document.getElementById('content-'+suf);
        if(!panel)return;
        panel.querySelectorAll('.card').forEach(function(card){
          card.querySelectorAll('[data-card-prop]').forEach(function(el){var prop=el.dataset.cardProp;el.style.display=vis[prop]!==false?'':'none';});
          var specs=card.querySelector('.card-specs');
          if(specs){var items=specs.querySelectorAll('[data-card-prop]');var any=Array.prototype.some.call(items,function(el){return el.style.display!=='none';});specs.style.display=any?'':'none';}
        });
      }
      colsPanel.querySelectorAll('input[data-card-prop]').forEach(function(cb){
        cb.addEventListener('change',function(){var vis=getVisibleProps();vis[cb.dataset.cardProp]=cb.checked;setVisibleProps(vis);applyColumnVisibility();});
      });
      applyColumnVisibility();
    });
    suffixes.forEach(function(suf){
      var filtersWrap=document.querySelector('#content-'+suf+' .filters-wrap');var toggleBtn=document.getElementById('filter-toggle-'+suf);var panel=document.getElementById('filter-panel-'+suf);
      if(filtersWrap&&toggleBtn&&panel){
        var filterCloseTimer=null;
        function showFilter(){if(filterCloseTimer){clearTimeout(filterCloseTimer);filterCloseTimer=null;}filtersWrap.classList.add('panel-open');panel.classList.add('is-open');toggleBtn.setAttribute('aria-expanded','true');}
        function hideFilter(){filterCloseTimer=setTimeout(function(){filtersWrap.classList.remove('panel-open');panel.classList.remove('is-open');toggleBtn.setAttribute('aria-expanded','false');filterCloseTimer=null;},220);}
        filtersWrap.addEventListener('mouseenter',showFilter);
        filtersWrap.addEventListener('mouseleave',hideFilter);
      }
      var grid=document.getElementById('cases-grid-'+suf);var countEl=document.getElementById('filter-count-'+suf);
      var statusSel=document.getElementById('filter-status-'+suf);var afectSel=document.getElementById('filter-afectation-'+suf);var providerSel=document.getElementById('filter-provider-'+suf);
      var platformSel=document.getElementById('filter-platform-'+suf);var modelSel=document.getElementById('filter-model-'+suf);var firmwareSel=document.getElementById('filter-firmware-'+suf);
      var clearBtn=document.getElementById('filter-clear-'+suf);if(!grid||!countEl)return;
      var cards=grid.querySelectorAll('.card');var total=cards.length;
      var showTxt=${JSON.stringify(showingEs)};var ofTxt=${JSON.stringify(ofEs)};
      if(suf==='en'){showTxt=${JSON.stringify(showingEn)};ofTxt=${JSON.stringify(ofEn)};}
      function updateCount(visible){countEl.textContent=visible<total?' · '+showTxt+' '+visible+' '+ofTxt+' '+total:'';}
      function applyFilters(){
        var status=statusSel?statusSel.value:'';var afect=afectSel?afectSel.value:'';var provider=providerSel?providerSel.value:'';
        var platform=platformSel?platformSel.value:'';var model=modelSel?modelSel.value:'';var firmware=firmwareSel?firmwareSel.value:'';
        var visible=0;
        cards.forEach(function(card){
          var show=(!status||card.dataset.status===status)&&(!afect||card.dataset.afectation===afect)&&(!provider||card.dataset.provider===provider)&&(!platform||card.dataset.platform===platform)&&(!model||card.dataset.model===model)&&(!firmware||card.dataset.firmware===firmware);
          card.style.display=show?'':'none';if(show)visible++;
        });
        updateCount(visible);
      }
      if(statusSel)statusSel.addEventListener('change',applyFilters);
      if(afectSel)afectSel.addEventListener('change',applyFilters);
      if(providerSel)providerSel.addEventListener('change',applyFilters);
      if(platformSel)platformSel.addEventListener('change',applyFilters);
      if(modelSel)modelSel.addEventListener('change',applyFilters);
      if(firmwareSel)firmwareSel.addEventListener('change',applyFilters);
      if(clearBtn)clearBtn.addEventListener('click',function(){if(statusSel)statusSel.value='';if(afectSel)afectSel.value='';if(providerSel)providerSel.value='';if(platformSel)platformSel.value='';if(modelSel)modelSel.value='';if(firmwareSel)firmwareSel.value='';applyFilters();});
      applyFilters();
    });
  })();
  </script>
  <button type="button" id="scroll-top-btn" class="scroll-top-btn" aria-label="${t("es", "scrollTop")}" title="${t("es", "scrollTop")}"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>
  <script>
  (function(){var btn=document.getElementById('scroll-top-btn');if(!btn)return;function onScroll(){btn.classList.toggle('is-visible',(window.scrollY||document.documentElement.scrollTop)>400);}window.addEventListener('scroll',onScroll,{passive:true});onScroll();btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});})();
  </script>
</body>
</html>`;
}

function buildIndexHtml(cases, filenames = null, lang = "es") {
  const used = new Set();
  const casesDir = lang === "en" ? "cases-en" : "cases";
  const indexBack = lang === "en" ? "index-en.html" : "index.html";
  const getFilename = (c, i) => filenames ? filenames[i] : getCaseFilename(c, i, used);
  const timeInfos = cases.map((c) => computeTimeInfo(c, lang));
  const statusColors = { Done: "#64748b", "Fix Scheduled": "#94a3b8", "In progress": "#2563eb", "Not started": "#94a3b8", "Escalated to En...": "#64748b", "Escalated to Engineering": "#64748b" };
  const afectacionColors = { "Critical 🔥": "#475569", "High 🚨": "#64748b", Normal: "#94a3b8", Low: "#cbd5e1" };
  const statuses = [...new Set(cases.map((c) => c.status).filter(Boolean))].sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a);
    const ib = STATUS_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const afectations = [...new Set(cases.map((c) => c.afectation).filter(Boolean))].sort((a, b) => {
    const ia = AFECTATION_ORDER.indexOf(a);
    const ib = AFECTATION_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const providers = [...new Set(cases.map((c) => c.provider).filter(Boolean))].sort();
  /* Misma lógica para TODOS los casos (nada hardcodeado por título/ID).
   * Prioridad: 1) allProps (alias normalizados) 2) getFromAllProps (patrones) 3) c.platform/model/firmwareVersion del sync.
   * Si en Notion no existen o están vacías Platform/Model/FW, se usa lo que guardó el sync (a veces inferido del texto). */
  const resolved = cases.map((c) => {
    const allProps = c.allProps || {};
    return {
      platform: getFromAllPropsByAliases(allProps, "platform") ?? getFromAllProps(allProps, "platform", "patform", "plataforma") ?? (c.platform ?? ""),
      model: getFromAllPropsByAliases(allProps, "model") ?? getFromAllProps(allProps, "model", "modelo") ?? (c.model ?? ""),
      fw: getFromAllPropsByAliases(allProps, "fw") ?? getFromAllProps(allProps, "firmware version", "firmware", "fw") ?? (c.firmwareVersion ?? ""),
    };
  });
  const platforms = [...new Set(resolved.map((r) => r.platform).filter(Boolean))].sort();
  const models = [...new Set(resolved.map((r) => r.model).filter(Boolean))].sort();
  const firmwares = [...new Set(resolved.map((r) => r.fw).filter(Boolean))].sort();
  const filterStatusOptions = statuses.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  const filterAfectOptions = afectations.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
  const filterProviderOptions = providers.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  const filterPlatformOptions = platforms.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  const filterModelOptions = models.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  const filterFirmwareOptions = firmwares.map((f) => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
  const cardsHtml = cases.map((c, i) => {
    const time = timeInfos[i];
    const htmlFilename = getFilename(c, i);
    const statusColor = statusColors[c.status] || "#6b7280";
    const statusIsOpen = ["In progress", "Not started", "Escalated to Engineering", "Escalated to En..."].includes(c.status);
    const afectColor = afectacionColors[c.afectation] || "#6b7280";
    const platform = resolved[i].platform;
    const model = resolved[i].model;
    const fw = resolved[i].fw;
    const statusVal = c.status || "";
    const spec = (propKey, label, value) => `<span class="card-spec-item" data-card-prop="${escapeHtml(propKey)}"><span class="card-spec-label">${escapeHtml(label)}</span><span class="card-spec-value${value ? "" : " card-spec-empty"}">${value ? escapeHtml(String(value)) : "—"}</span></span>`;
    return `
    <article class="card" data-status="${escapeHtml(statusVal)}" data-afectation="${escapeHtml(c.afectation || "")}" data-provider="${escapeHtml(c.provider || "")}" data-platform="${escapeHtml(platform)}" data-model="${escapeHtml(model)}" data-firmware="${escapeHtml(fw)}" style="--card-accent:${statusColor}">
      <div class="card-header">
        <div class="badges" data-card-prop="badges">
          ${c.status ? `<span class="badge badge-status ${statusIsOpen ? "status-badge--open" : "status-badge--done"}" style="--badge-color:${statusColor}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(c.status)}</span>` : ""}
          ${c.provider ? `<span class="badge badge-provider">${escapeHtml(c.provider)}</span>` : ""}
          ${c.afectation ? `<span class="badge badge-afect" style="--badge-color:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
        </div>
      </div>
      <h2 class="card-title"><a href="${casesDir}/${htmlFilename}" title="${escapeHtml(c.caseName)}">${escapeHtml(c.caseName)}</a></h2>
      <div class="card-meta" data-card-prop="cardMeta">
        ${c.caseNumber ? `<span>Case <strong>${escapeHtml(c.caseNumber)}</strong></span>` : ""}
        ${c.createdDate ? `<span>${escapeHtml(c.createdDate)}</span>` : ""}
      </div>
      <div class="card-specs">
        ${spec("status", "Status", statusVal)}
        ${spec("platform", "Platform", platform)}
        ${spec("model", "Model", model)}
        ${spec("firmware", "FW", fw)}
      </div>
      <div class="card-time" data-card-prop="time">
        ${time.label ? `<span class="time-label">${escapeHtml(time.label)}</span>` : ""}
        ${time.subLabel ? `<span class="time-sublabel">${escapeHtml(time.subLabel)}</span>` : ""}
      </div>
      <div class="card-actions" data-card-prop="actions">
        <a href="${casesDir}/${htmlFilename}" class="btn btn-secondary">${t(lang, "viewDetail")}</a>
      </div>
    </article>`;
  }).join("");

  const logoImg = `<img src="assets/logoheader-1.svg" alt="FiberX" class="logo-icon logo-icon-dark" width="168" height="52" loading="lazy" /><img src="assets/logoheader-light.svg" alt="FiberX" class="logo-icon logo-icon-light" width="168" height="52" loading="lazy" />`;
  const themeLabel = t(lang, "switchThemeLight");
  const allOpt = lang === "es" ? "Todos" : "All";
  const allFemOpt = lang === "es" ? "Todas" : "All";
  return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t(lang, "reportTitle")} | FiberX</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="styles/report.css">
</head>
<body class="report-index">
  <script>
  (function(){var k='report-theme';var s=document.documentElement.getAttribute('data-theme')||localStorage.getItem(k)||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);})();
  </script>
  <div class="container">
    <header class="top-bar" role="banner">
      <a href="https://gofiberx.com" class="logo" target="_blank" rel="noopener" aria-label="${t(lang, "goToSite")}">${logoImg}</a>
      <div class="top-bar-actions">
        <a href="${lang === "en" ? "index.html" : "index-en.html"}" class="lang-switch btn btn-secondary" aria-label="${lang === "en" ? t(lang, "langSwitchToEs") : t(lang, "langSwitchToEn")}">${lang === "en" ? t(lang, "langSwitchToEs") : t(lang, "langSwitchToEn")}</a>
        <button type="button" id="theme-toggle" class="theme-toggle theme-btn" aria-label="${themeLabel}" title="${themeLabel}"><i class="fa-solid fa-sun theme-btn-icon" aria-hidden="true"></i></button>
      </div>
    </header>
    <main class="main-content">
    <header>
      <h1>${t(lang, "reportTitle")}</h1>
      <p>${t(lang, "reportSubtitle").replace(/\*\*/g, "")}</p>
      <div class="stats"><span>${t(lang, "totalCasesCount")}: <strong>${cases.length}</strong> ${t(lang, "cases")}</span><span id="filter-count" class="filter-count"></span></div>
    </header>
    <div class="toolbar-row">
    <div class="filters-wrap">
      <button type="button" id="filter-toggle" class="filter-toggle" aria-expanded="false" aria-controls="filter-panel" aria-label="${t(lang, "showFilters")}">
        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
        <span>${t(lang, "filters")}</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="filter-panel" class="filter-panel" role="region" aria-label="${t(lang, "filters")}">
        <div class="filters">
          <div class="filter-group">
            <label for="filter-status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${t(lang, "state")}</label>
            <select id="filter-status" class="filter-select" aria-label="${t(lang, "state")}">
              <option value="">${allOpt}</option>${filterStatusOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-afectation"><i class="fa-solid fa-bolt" aria-hidden="true"></i> ${t(lang, "affectationLabel")}</label>
            <select id="filter-afectation" class="filter-select" aria-label="${t(lang, "affectationLabel")}">
              <option value="">${allFemOpt}</option>${filterAfectOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-provider"><i class="fa-solid fa-building" aria-hidden="true"></i> ${t(lang, "provider")}</label>
            <select id="filter-provider" class="filter-select" aria-label="${t(lang, "provider")}">
              <option value="">${allOpt}</option>${filterProviderOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-platform"><i class="fa-solid fa-server" aria-hidden="true"></i> Platform</label>
            <select id="filter-platform" class="filter-select" aria-label="Platform">
              <option value="">${allFemOpt}</option>${filterPlatformOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-model"><i class="fa-solid fa-cube" aria-hidden="true"></i> Model</label>
            <select id="filter-model" class="filter-select" aria-label="Model">
              <option value="">${allFemOpt}</option>${filterModelOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-firmware"><i class="fa-solid fa-code-branch" aria-hidden="true"></i> FW</label>
            <select id="filter-firmware" class="filter-select" aria-label="FW">
              <option value="">${allFemOpt}</option>${filterFirmwareOptions}
            </select>
          </div>
          <button type="button" id="filter-clear" class="btn btn-filter-clear" aria-label="${t(lang, "clearFilters")}">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> ${t(lang, "clearFilters")}
          </button>
        </div>
      </div>
    </div>
    <div class="columns-wrap">
      <button type="button" id="columns-toggle" class="filter-toggle" aria-expanded="false" aria-controls="columns-panel" aria-label="${t(lang, "showColumns")}">
        <i class="fa-solid fa-table-columns" aria-hidden="true"></i>
        <span>${t(lang, "whatToShow")}</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="columns-panel" class="filter-panel" role="region" aria-label="${t(lang, "whatToShow")}">
        <div class="columns-options">
          <label class="column-option"><input type="checkbox" id="col-badges" data-card-prop="badges" checked> <span>${t(lang, "badges")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-cardMeta" data-card-prop="cardMeta" checked> <span>${t(lang, "caseAndDate")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-status" data-card-prop="status" checked> <span>${t(lang, "status")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-platform" data-card-prop="platform" checked> <span>Platform</span></label>
          <label class="column-option"><input type="checkbox" id="col-model" data-card-prop="model" checked> <span>Model</span></label>
          <label class="column-option"><input type="checkbox" id="col-firmware" data-card-prop="firmware" checked> <span>FW</span></label>
          <label class="column-option"><input type="checkbox" id="col-time" data-card-prop="time" checked> <span>${t(lang, "time")}</span></label>
          <label class="column-option"><input type="checkbox" id="col-actions" data-card-prop="actions" checked> <span>${t(lang, "actions")}</span></label>
        </div>
      </div>
    </div>
    </div>
    <div class="grid" id="cases-grid">
${cardsHtml}
    </div>
    </main>
    <div class="footer-wrap">
      <footer class="footer">
        ${t(lang, "teamFooter")}
      </footer>
    </div>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;var icon=b.querySelector('.theme-btn-icon');var lightL="${String(t(lang, "switchThemeLight")).replace(/"/g, '\\"')}";var darkL="${String(t(lang, "switchThemeDark")).replace(/"/g, '\\"')}";function u(){var s=document.documentElement.getAttribute('data-theme');var isDark=s==='dark';b.setAttribute('aria-label',isDark?lightL:darkL);b.setAttribute('title',isDark?lightL:darkL);if(icon){icon.className='theme-btn-icon fa-solid '+(isDark?'fa-sun':'fa-moon');}}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
  <script>
  (function(){
    var kProps='report-card-props';
    var defaultProps={badges:true,cardMeta:true,status:true,platform:true,model:true,firmware:true,time:true,actions:true};
    var colsWrap=document.querySelector('.columns-wrap');var colsToggle=document.getElementById('columns-toggle');var colsPanel=document.getElementById('columns-panel');
    if(colsWrap&&colsToggle&&colsPanel){
      var colsCloseTimer=null;
      function showCols(){if(colsCloseTimer){clearTimeout(colsCloseTimer);colsCloseTimer=null;}colsWrap.classList.add('panel-open');colsPanel.classList.add('is-open');colsToggle.setAttribute('aria-expanded','true');}
      function hideCols(){colsCloseTimer=setTimeout(function(){colsWrap.classList.remove('panel-open');colsPanel.classList.remove('is-open');colsToggle.setAttribute('aria-expanded','false');colsCloseTimer=null;},220);}
      colsWrap.addEventListener('mouseenter',showCols);
      colsWrap.addEventListener('mouseleave',hideCols);
    }
    function getVisibleProps(){try{var s=localStorage.getItem(kProps);if(s){var o=JSON.parse(s);return Object.assign({},defaultProps,o);}}catch(e){}return defaultProps;}
    function setVisibleProps(o){localStorage.setItem(kProps,JSON.stringify(o));}
    function applyColumnVisibility(){
      var vis=getVisibleProps();
      var panel=document.getElementById('columns-panel');
      if(panel){panel.querySelectorAll('input[data-card-prop]').forEach(function(cb){cb.checked=vis[cb.dataset.cardProp]!==false;});}
      document.querySelectorAll('.card').forEach(function(card){
        card.querySelectorAll('[data-card-prop]').forEach(function(el){var prop=el.dataset.cardProp;el.style.display=vis[prop]!==false?'':'none';});
        var specs=card.querySelector('.card-specs');
        if(specs){var items=specs.querySelectorAll('[data-card-prop]');var any=Array.prototype.some.call(items,function(el){return el.style.display!=='none';});specs.style.display=any?'':'none';}
      });
    }
    document.querySelectorAll('#columns-panel input[data-card-prop]').forEach(function(cb){
      cb.addEventListener('change',function(){var vis=getVisibleProps();vis[cb.dataset.cardProp]=cb.checked;setVisibleProps(vis);applyColumnVisibility();});
    });
    applyColumnVisibility();
    var filtersWrap=document.querySelector('.filters-wrap');var toggleBtn=document.getElementById('filter-toggle');var panel=document.getElementById('filter-panel');
    if(filtersWrap&&toggleBtn&&panel){
      var filterCloseTimer=null;
      function showFilter(){if(filterCloseTimer){clearTimeout(filterCloseTimer);filterCloseTimer=null;}filtersWrap.classList.add('panel-open');panel.classList.add('is-open');toggleBtn.setAttribute('aria-expanded','true');}
      function hideFilter(){filterCloseTimer=setTimeout(function(){filtersWrap.classList.remove('panel-open');panel.classList.remove('is-open');toggleBtn.setAttribute('aria-expanded','false');filterCloseTimer=null;},220);}
      filtersWrap.addEventListener('mouseenter',showFilter);
      filtersWrap.addEventListener('mouseleave',hideFilter);
    }
    var grid=document.getElementById('cases-grid');var countEl=document.getElementById('filter-count');
    var statusSel=document.getElementById('filter-status');var afectSel=document.getElementById('filter-afectation');var providerSel=document.getElementById('filter-provider');
    var platformSel=document.getElementById('filter-platform');var modelSel=document.getElementById('filter-model');var firmwareSel=document.getElementById('filter-firmware');
    var clearBtn=document.getElementById('filter-clear');if(!grid||!countEl)return;
    var cards=grid.querySelectorAll('.card');var total=cards.length;
    function updateCount(visible){countEl.textContent=visible<total?' · ${t(lang, "showing")} '+visible+' ${t(lang, "of")} '+total:'';}
    function applyFilters(){
      var status=statusSel?statusSel.value:'';var afect=afectSel?afectSel.value:'';var provider=providerSel?providerSel.value:'';
      var platform=platformSel?platformSel.value:'';var model=modelSel?modelSel.value:'';var firmware=firmwareSel?firmwareSel.value:'';
      var visible=0;
      cards.forEach(function(card){
        var show=(!status||card.dataset.status===status)&&(!afect||card.dataset.afectation===afect)&&(!provider||card.dataset.provider===provider)&&(!platform||card.dataset.platform===platform)&&(!model||card.dataset.model===model)&&(!firmware||card.dataset.firmware===firmware);
        card.style.display=show?'':'none';if(show)visible++;
      });
      updateCount(visible);
    }
    if(statusSel)statusSel.addEventListener('change',applyFilters);
    if(afectSel)afectSel.addEventListener('change',applyFilters);
    if(providerSel)providerSel.addEventListener('change',applyFilters);
    if(platformSel)platformSel.addEventListener('change',applyFilters);
    if(modelSel)modelSel.addEventListener('change',applyFilters);
    if(firmwareSel)firmwareSel.addEventListener('change',applyFilters);
    if(clearBtn)clearBtn.addEventListener('click',function(){if(statusSel)statusSel.value='';if(afectSel)afectSel.value='';if(providerSel)providerSel.value='';if(platformSel)platformSel.value='';if(modelSel)modelSel.value='';if(firmwareSel)firmwareSel.value='';applyFilters();});
    applyFilters();
  })();
  </script>
  <button type="button" id="scroll-top-btn" class="scroll-top-btn" aria-label="${t(lang, "scrollTop")}" title="${t(lang, "scrollTop")}"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>
  <script>
  (function(){var btn=document.getElementById('scroll-top-btn');if(!btn)return;function onScroll(){btn.classList.toggle('is-visible',(window.scrollY||document.documentElement.scrollTop)>400);}window.addEventListener('scroll',onScroll,{passive:true});onScroll();btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});})();
  </script>
</body>
</html>`;
}

/** Lista de IDs para el índice del PDF (para calcular números de página en dos pasadas). sub = true para filas hijas. */
function getTocEntryIds(cases, lang = "es") {
  const ids = [{ id: "toc-resumen", label: t(lang, "casesSummary"), sub: false }];
  cases.forEach((c, i) => {
    const n = i + 1;
    ids.push({ id: `case-${n}`, label: `${n}. ${c.caseName.length > 55 ? c.caseName.slice(0, 55) + "…" : c.caseName}`, sub: false });
    ids.push({ id: `case-${n}-details`, label: t(lang, "generalDetails"), sub: true });
    ids.push({ id: `case-${n}-summary`, label: t(lang, "summarySection"), sub: true });
    ids.push({ id: `case-${n}-problem`, label: t(lang, "problemDetail"), sub: true });
    ids.push({ id: `case-${n}-resolution`, label: t(lang, "resolution"), sub: true });
    ids.push({ id: `case-${n}-notes`, label: t(lang, "notesSection"), sub: true });
  });
  return ids;
}

/** HTML de la portada del PDF: logo izquierda, línea encima del título, título grande, disclaimer al final centrado y ancho. */
function buildPdfCoverHtml(cases, logoDataUrl = "", lang = "es") {
  const logoImg = logoDataUrl ? `<img src="${logoDataUrl}" alt="FiberX" class="cover-logo" width="240" height="74" />` : "";
  return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "es"}">
<head><meta charset="UTF-8"><title>${t(lang, "reportTitle")}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Inter", sans-serif; margin: 0; padding: 2rem 2rem 2.2rem 2rem; min-height: 100vh; }
    .pdf-cover { display: flex; flex-direction: column; width: 100%; min-height: 100%; }
    .cover-header { flex-shrink: 0; margin-bottom: 0.5rem; }
    .cover-logo-wrap { display: flex; justify-content: flex-start; }
    .cover-logo { display: block; }
    .cover-main { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem 0; }
    .cover-title-block { display: flex; flex-direction: column; align-items: flex-start; text-align: left; max-width: 520px; margin-top: 5rem; }
    .cover-line { height: 4px; width: 240px; max-width: 50%; background: #2563eb; border: none; margin: 0 0 1rem; border-radius: 2px; flex-shrink: 0; align-self: flex-start; }
    .cover-title { font-family: "Outfit", sans-serif; font-size: 42px; font-weight: 700; margin: 0 0 0.5rem; color: #111; line-height: 1.2; }
    .cover-subtitle { font-size: 14px; color: #555; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
    .cover-footer { margin-top: auto; flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; width: 100%; padding-top: 1rem; }
    .cover-footer .cover-spacer { flex: 1; min-height: 4rem; }
    .cover-footer .cover-disclaimer-wrap { flex-shrink: 0; width: 100%; display: flex; justify-content: center; padding-bottom: 0.8rem; }
    .cover-disclaimer { font-size: 9px; color: #666; line-height: 1.45; text-align: center; width: 100%; max-width: 520px; margin: 0; padding: 0.75rem 1rem 1.2rem; border: 1px solid #ddd; background: #f9f9f9; }
  </style>
</head>
<body>
  <section class="pdf-cover">
    <div class="cover-header">
      <div class="cover-logo-wrap">${logoImg}</div>
    </div>
    <div class="cover-main">
      <div class="cover-title-block">
        <hr class="cover-line" aria-hidden="true">
        <h1 class="cover-title">${t(lang, "reportTitle")}</h1>
        <p class="cover-subtitle">${t(lang, "reportOfCases")}</p>
      </div>
    </div>
    <div class="cover-footer">
      <div class="cover-spacer" aria-hidden="true"></div>
      <div class="cover-disclaimer-wrap">
        <p class="cover-disclaimer">${escapeHtml(t(lang, "disclaimer"))}</p>
      </div>
    </div>
  </section>
</body>
</html>`;
}

/** Introducción / alcance del documento (Summary / Scope). Editable para ajustar el texto. */
const PDF_DOC_SCOPE =
  "Este documento es un reporte de casos de soporte de Device Providers, generado a partir de la base de datos del equipo de soporte de FiberX, y muestra el estado de todos los casos abiertos y cerrados. El objetivo es generar visibilidad del estado de cada caso y permitir acceder al detalle completo (resumen, problema, resolución y notas).";

/** HTML del cuerpo del PDF: índice (con números de página), resumen y casos. tocPageNumbers = { id: número de página final } */
function buildPdfBodyHtml(cases, tocPageNumbers = {}, lang = "es") {
  const locale = lang === "en" ? "en" : "es";
  const dateStr = new Date().toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
  const reportDateStr = new Date().toLocaleDateString(locale, { month: "long", year: "numeric" });
  const tableRows = cases
    .map(
      (c, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(c.caseName)}</td><td>${escapeHtml(c.caseNumber || "—")}</td><td>${escapeHtml(c.provider || "—")}</td><td>${escapeHtml(c.status || "—")}</td><td>${escapeHtml(c.afectation || "—")}</td><td>${escapeHtml(c.createdDate || "—")}</td></tr>`
    )
    .join("");

  const tocEntries = getTocEntryIds(cases, lang);
  const tocRows = tocEntries
    .map((e) => {
      const page = tocPageNumbers[e.id] != null ? String(tocPageNumbers[e.id]) : "—";
      const rowClass = e.sub ? "toc-sub" : "";
      return `<tr class="${rowClass}"><td class="toc-label"><a href="#${escapeHtml(e.id)}" class="toc-link">${escapeHtml(e.label)}</a></td><td class="toc-page">${page}</td></tr>`;
    })
    .join("");

  const caseSections = cases
    .map((c, i) => {
      const n = i + 1;
      const time = computeTimeInfo(c, lang);
      const propsTable = buildPdfPropsTable(c.allProps);
      const resumen = c.resumen ? `<div id="case-${n}-summary" class="block"><h3>${t(lang, "summarySection")}</h3>${textToHtml(c.resumen)}</div>` : `<div id="case-${n}-summary" class="block"></div>`;
      const notas = c.notas ? `<div id="case-${n}-notes" class="block"><h3>${t(lang, "notesSection")}</h3>${textToHtml(c.notas)}</div>` : `<div id="case-${n}-notes" class="block"></div>`;
      const detalle = c.detalleDelProblema ? `<div id="case-${n}-problem" class="block"><h3>${t(lang, "problemDetail")}</h3>${textToHtml(c.detalleDelProblema)}</div>` : `<div id="case-${n}-problem" class="block"></div>`;
      const resolucion = c.resolucion ? `<div id="case-${n}-resolution" class="block"><h3>${t(lang, "resolution")}</h3>${textToHtml(c.resolucion)}</div>` : `<div id="case-${n}-resolution" class="block"></div>`;
      return `
  <section class="case-section" id="case-${n}">
    <h2>${n}. ${escapeHtml(c.caseName)}</h2>
    <p class="case-meta">${c.caseNumber ? `Case #${escapeHtml(c.caseNumber)}` : ""} ${c.internalTicket ? ` · Ticket ${escapeHtml(c.internalTicket)}` : ""} · ${escapeHtml(c.status || "")} · ${escapeHtml(c.afectation || "")} · ${time.label ? escapeHtml(time.label) : ""} · ${t(lang, "createdLabel")}: ${escapeHtml(c.createdDate || "—")}${c.dueDate ? ` · ${t(lang, "dueLabel")}: ${escapeHtml(c.dueDate)}` : ""}</p>
    <div id="case-${n}-details" class="case-details">${propsTable}</div>
    ${resumen}${notas}${detalle}${resolucion}
  </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "es"}">
<head>
  <meta charset="UTF-8">
  <title>${t(lang, "reportTitle")}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Inter", system-ui, sans-serif; font-size: 11px; line-height: 1.4; color: #111; margin: 0; padding: 0.6cm; }
    h1 { font-family: "Outfit", sans-serif; font-size: 22px; font-weight: 600; margin: 0 0 0.5em; }
    h2 { font-family: "Outfit", sans-serif; font-size: 20px; font-weight: 600; margin: 1em 0 0.35em; page-break-after: avoid; }
    h3 { font-family: "Outfit", "Inter", sans-serif; font-size: 11px; font-weight: 600; margin: 0.75em 0 0.4em; color: #111; page-break-after: avoid; text-transform: uppercase; letter-spacing: 0.04em; }
    .block h3 { font-family: "Outfit", "Inter", sans-serif; font-size: 11px; font-weight: 600; margin: 0 0 0.4em; color: #111; text-transform: uppercase; letter-spacing: 0.04em; }
    p { margin: 0 0 0.45em; }
    .report-date { color: #555; margin-top: 0.6em; margin-bottom: 0; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 0.4em 0; font-size: 10px; page-break-inside: avoid; }
    table.resumen-table { font-size: 9px; }
    table.resumen-table td:nth-child(7), table.resumen-table th:nth-child(7) { white-space: nowrap; }
    th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    #toc-resumen { page-break-after: always; }
    .doc-summary { margin-bottom: 1em; page-break-inside: avoid; }
    .doc-summary p { margin: 0 0 0.5em; line-height: 1.45; font-size: 11px; color: #111; }
    .doc-summary p:last-child { margin-bottom: 0; }
    .case-section { page-break-before: always; }
    .case-section:first-of-type { page-break-before: always; }
    .case-meta { color: #555; font-size: 10px; margin-bottom: 0.5em; }
    .case-section .case-details { margin-bottom: 1.2em; }
    .props-table { font-size: 9px; table-layout: fixed; }
    .props-table .props-cell { padding: 2px 6px; border: 1px solid #e0e0e0; vertical-align: top; word-break: break-word; }
    .props-table .props-cell-full { width: 100%; }
    .block { margin-bottom: 0.8em; page-break-inside: avoid; }
    .block p { margin-bottom: 0.35em; }
    .detail-code, pre.detail-code { font-family: ui-monospace, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; font-size: 9px; line-height: 1.4; margin: 0.4em 0; padding: 0.5em 0.6em; background: #f5f5f5; border: 1px solid #ddd; border-left: 3px solid #2563eb; border-radius: 4px; overflow-x: auto; white-space: pre; color: #111; page-break-inside: avoid; }
    .footer { margin-top: 1.5em; padding-top: 0.4em; font-size: 9px; color: #666; border-top: 1px solid #ddd; }
    .pdf-toc-wrap { page-break-after: always; page-break-inside: avoid; margin: 0; padding: 0; }
    .pdf-toc .toc-table { width: 100%; border-collapse: collapse; font-size: 10px; line-height: 1.25; }
    .pdf-toc .toc-table caption { font-family: "Outfit", sans-serif; font-size: 22px; font-weight: 600; text-align: left; margin: 0 0 0.4rem; padding-bottom: 0.35rem; border-bottom: 2px solid #111; caption-side: top; }
    .pdf-toc .toc-table td { padding: 0.08em 0.5em 0.08em 0; vertical-align: top; border: none; }
    .pdf-toc .toc-label { width: 85%; }
    .pdf-toc .toc-page { width: 15%; text-align: right; color: #555; }
    .pdf-toc .toc-link { color: #111; text-decoration: none; }
    .pdf-toc .toc-link:hover { text-decoration: underline; }
    .pdf-toc tr.toc-sub td.toc-label { padding-left: 3.5em; padding-top: 0.18em; padding-bottom: 0.18em; font-size: 9px; color: #444; }
    .pdf-toc tr.toc-sub td.toc-page { padding-top: 0.18em; padding-bottom: 0.18em; }
  </style>
</head>
<body>
  <div class="pdf-toc-wrap" id="toc">
    <section class="pdf-toc">
      <table class="toc-table"><caption>${t(lang, "tocTitle")}</caption><tbody>${tocRows}</tbody></table>
    </section>
  </div>
  <div id="toc-resumen">
    <h1 style="margin-top: 0;">${t(lang, "casesSummary")}</h1>
    <div class="doc-summary">
      <p>${escapeHtml(t(lang, "docScope"))}</p>
    </div>
    <table class="resumen-table">
      <thead><tr><th>#</th><th>${t(lang, "caseName")}</th><th>${t(lang, "caseNumber")}</th><th>${t(lang, "provider")}</th><th>${t(lang, "status")}</th><th>${t(lang, "affectation")}</th><th>${t(lang, "created")}</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p class="report-date">${t(lang, "reportGenerated")} ${reportDateStr}. ${t(lang, "totalCasesCount")}: ${cases.length} ${t(lang, "cases")}.</p>
  </div>
  ${caseSections}
  <div class="footer">${t(lang, "teamFooter")}</div>
</body>
</html>`;
}

/** Devuelve el HTML de un único documento PDF (portada + cuerpo) para que los enlaces del índice funcionen. */
function buildPdfFullHtml(cases, logoDataUrl, tocPageNumbers = {}, lang = "es") {
  const coverHtml = buildPdfCoverHtml(cases, logoDataUrl, lang);
  const bodyHtml = buildPdfBodyHtml(cases, tocPageNumbers, lang);
  const coverBody = coverHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "").trim();
  const bodyBody = bodyHtml.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "").trim();
  const coverStyles = coverHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  const bodyStyles = bodyHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Device Providers – Support Cases</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    ${coverStyles}
    .pdf-cover { page-break-after: always; padding: 2rem 2rem 0 2rem; min-height: 100vh; box-sizing: border-box; }
    .pdf-body-wrap { padding: 0.6cm; }
    ${bodyStyles}
    body { padding: 0 !important; }
  </style>
</head>
<body>
${coverBody}
<div class="pdf-body-wrap">
${bodyBody}
</div>
</body>
</html>`;
}

/** HTML completo para exportar a PDF (portada + cuerpo en un solo documento); para compatibilidad. */
function buildPdfHtml(cases, options = {}) {
  const lang = options.lang || "es";
  const bodyHtml = buildPdfBodyHtml(cases, options.tocPageNumbers || {}, lang);
  const logoDataUrl = options.logoDataUrl || "";
  const dateStr = new Date().toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });
  const logoImg = logoDataUrl ? `<img src="${logoDataUrl}" alt="FiberX" class="cover-logo" width="180" height="55" style="margin-bottom:1.5rem" />` : "";
  const coverSection = `
  <div class="pdf-cover-wrap" style="position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:2rem;page-break-after:always">
    <section class="pdf-cover">
      ${logoImg}
      <h1 style="font-family:Outfit,sans-serif;font-size:28px;font-weight:600;margin:0 0 0.5rem;color:#111">Device Providers – Support Cases</h1>
      <p style="font-size:14px;color:#555;margin:0 0 2rem;letter-spacing:0.05em;text-transform:uppercase">Reporte de casos · Release notes</p>
      <p style="font-size:12px;color:#666;margin:0 0 0.5rem">${dateStr}</p>
      <p style="font-size:11px;color:#888;margin:0 0 1.5rem">Total: ${cases.length} casos</p>
      <p style="font-size:9px;color:#666;max-width:480px;line-height:1.45;margin:0;padding:0.75rem 1rem;border:1px solid #ddd;background:#f9f9f9">Este documento contiene información confidencial de FiberX y está destinado únicamente a los destinatarios autorizados. Su distribución, reproducción o uso no autorizado está prohibida. La información aquí incluida no puede ser divulgada a terceros sin autorización previa por escrito.</p>
    </section>
  </div>`;
  return bodyHtml.replace("<body>", "<body>" + coverSection);
}

/** Footer HTML para el PDF (Puppeteer): texto confidencial y "Página X de Y" según idioma. */
function getPdfFooterTemplate(lang = "es") {
  const conf = t(lang, "confidential");
  const pageLabel = t(lang, "page");
  const ofLabel = t(lang, "ofPages");
  return `
    <div style="padding: 0 0.6cm; width: 100%; box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
      <table style="width: 100%; font-size: 8px; color: #666; border: none; font-family: inherit;">
        <tr><td style="text-align: left; width: 50%;">${escapeHtml(conf)}</td>
        <td style="text-align: right; width: 50%;">${escapeHtml(pageLabel)} <span class="pageNumber"></span> ${escapeHtml(ofLabel)} <span class="totalPages"></span></td></tr>
      </table>
    </div>`;
}

export { slug, sortCases, computeTimeInfo, getCaseFilename, buildReadme, buildCaseDetailHtml, buildIndexHtml, buildSingleIndexHtml, buildPdfHtml, buildPdfCoverHtml, buildPdfBodyHtml, buildPdfFullHtml, getTocEntryIds, getPdfFooterTemplate, caseToMarkdown };
