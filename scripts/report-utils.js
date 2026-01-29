/**
 * Utilidades para generar el reporte (README, index.html, cases/*.html) desde data/cases.json.
 */

const STATUS_ORDER = [
  "Not started",
  "In progress",
  "Escalated to En...",
  "Escalated to Engineering",
  "Fix Scheduled",
  "Done",
];
const AFECTATION_ORDER = ["Critical 🔥", "High 🚨", "Normal", "Low"];

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

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(str) {
  if (!str || !String(str).trim()) return "";
  return String(str)
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function groupProps(allProps) {
  const id = [], fechas = [], clasif = [], dispositivo = [], otros = [];
  for (const [name, value] of Object.entries(allProps || {})) {
    if (value == null || !String(value).trim()) continue;
    const v = escapeHtml(String(value)).replace(/\n/g, "<br>");
    const row = `<div class="prop-row"><span class="prop-label">${escapeHtml(name)}</span><span class="prop-value">${v}</span></div>`;
    if (["Case Number", "Internal Ticket"].includes(name)) id.push(row);
    else if (["Created Date", "Due Date"].includes(name)) fechas.push(row);
    else if (["Status", "Afectation", "Affectation", "Failure Type", "Provider"].includes(name)) clasif.push(row);
    else if (["Device", "Model", "Serial Number", "Firmware Version", "Platform", "Patform"].includes(name)) dispositivo.push(row);
    else otros.push(row);
  }
  return { id, fechas, clasif, dispositivo, otros };
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

function buildReadme(cases) {
  const lines = [
    "# Device Providers – Support Cases",
    "",
    "Reporte generado desde **data/cases.json** (sincronizado con Notion), para presentación a personas externas.",
    "",
    "## Resumen",
    "",
    `Total de casos: **${cases.length}**. Enlaces directos a cada caso:`,
    "",
  ];
  cases.forEach((c, i) => {
    const fileSlug = slug(c.caseName);
    const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.html`;
    const shortTitle = c.caseName.length > 70 ? c.caseName.slice(0, 70) + "…" : c.caseName;
    lines.push(`- [**${i + 1}.** ${shortTitle}](cases/${filename}) — ${c.status || "—"} · ${c.afectation || "—"}`);
  });
  lines.push("", "---", "", "## Índice de casos (tabla)", "",
    "| # | Case Name | Provider | Case # | Status | Affectation | Created |",
    "|---|-----------|----------|--------|--------|-------------|--------|",
  );
  cases.forEach((c, i) => {
    const fileSlug = slug(c.caseName);
    const filename = `${String(i + 1).padStart(2, "0")}-${fileSlug}.html`;
    const link = `[${c.caseName.slice(0, 50)}${c.caseName.length > 50 ? "…" : ""}](cases/${filename})`;
    lines.push(`| ${i + 1} | ${link} | ${c.provider || "—"} | ${c.caseNumber || "—"} | ${c.status || "—"} | ${c.afectation || "—"} | ${c.createdDate || "—"} |`);
  });
  lines.push("", "---", "", "*FX NetOps Team 2026 · [noc@fiberx.net](mailto:noc@fiberx.net) · [fiberx.net](https://fiberx.net)*", "");
  return lines.join("\n");
}

function buildCaseDetailHtml(c, index) {
  const time = computeTimeInfo(c);
  const statusColors = { Done: "#22c55e", "Fix Scheduled": "#f59e0b", "In progress": "#3b82f6", "Not started": "#6b7280", "Escalated to En...": "#ec4899", "Escalated to Engineering": "#ec4899" };
  const afectacionColors = { "Critical 🔥": "#dc2626", "High 🚨": "#ea580c", Normal: "#6b7280", Low: "#22c55e" };
  const statusColor = statusColors[c.status] || "#6b7280";
  const afectColor = afectacionColors[c.afectation] || "#6b7280";
  const groups = groupProps(c.allProps);
  const dueWarning =
    c.dueDate && c.createdDate && new Date(c.dueDate) < new Date(c.createdDate)
      ? '<span class="due-warning">Vencido</span>'
      : time.subLabel ? `<span class="due-info">${escapeHtml(time.subLabel)}</span>` : "";
  const propBlock = (title, rows) =>
    rows.length ? `<div class="prop-group"><h3 class="prop-group-title">${escapeHtml(title)}</h3><div class="prop-list">${rows.join("")}</div></div>` : "";
  const resumenSection = c.resumen ? `<section class="detail-section"><h2 class="section-title">Resumen</h2><div class="detail-content">${textToHtml(c.resumen)}</div></section>` : "";
  const notasSection = c.notas ? `<section class="detail-section"><h2 class="section-title">Notas</h2><div class="detail-content">${textToHtml(c.notas)}</div></section>` : "";
  const resumenNotasRow = resumenSection || notasSection ? `<div class="detail-row-2">${resumenSection}${notasSection}</div>` : "";
  const sections = [];
  if (c.detalleDelProblema) sections.push(`<section class="detail-section"><h2 class="section-title">Detalle del problema</h2><div class="detail-content">${textToHtml(c.detalleDelProblema)}</div></section>`);
  if (c.resolucion) sections.push(`<section class="detail-section"><h2 class="section-title">Resolución</h2><div class="detail-content">${textToHtml(c.resolucion)}</div></section>`);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${index}. ${escapeHtml(c.caseName)}</title>
  <link rel="stylesheet" href="../styles/report.css">
</head>
<body class="report-case">
  <script>
  (function(){var k='report-theme';var s=document.documentElement.getAttribute('data-theme')||localStorage.getItem(k)||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);})();
  </script>
  <div class="container">
    <div class="page-top">
      <div class="back"><a href="../index.html">← Volver al reporte</a></div>
      <button type="button" id="theme-toggle" class="theme-toggle" aria-label="Cambiar modo claro u oscuro">Modo claro</button>
    </div>
    <div class="case-details">
      <header class="case-hero">
        <div class="case-hero-top">
          ${c.caseNumber ? `<span class="case-num">Case #${escapeHtml(c.caseNumber)}</span>` : ""}
          ${c.internalTicket ? `<span class="case-num">Ticket ${escapeHtml(c.internalTicket)}</span>` : ""}
          ${c.status ? `<span class="badge" style="background:${statusColor}">${escapeHtml(c.status)}</span>` : ""}
          ${c.provider ? `<span class="badge" style="background:#6366f1">${escapeHtml(c.provider)}</span>` : ""}
          ${c.afectation ? `<span class="badge" style="background:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
        </div>
        <h1 class="case-title">${escapeHtml(c.caseName)}</h1>
        <div class="key-info">
          ${time.label ? `<span class="key-info-item"><strong>${escapeHtml(time.label)}</strong></span>` : ""}
          ${c.createdDate ? `<span class="key-info-item">Creado: ${escapeHtml(c.createdDate)}</span>` : ""}
          ${c.dueDate ? `<span class="key-info-item">Vence: ${escapeHtml(c.dueDate)}</span>` : ""}
          ${dueWarning ? `<span class="key-info-item">${dueWarning}</span>` : ""}
        </div>
      </header>
      <div class="props-grid">
        ${propBlock("Identificación", groups.id)}
        ${propBlock("Fechas", groups.fechas)}
        ${propBlock("Clasificación", groups.clasif)}
        ${propBlock("Dispositivo", groups.dispositivo)}
        ${propBlock("Otros", groups.otros)}
      </div>
    </div>
    <div class="case-body">
      <div class="content-divider">Contenido del caso</div>
      ${resumenNotasRow}
      ${sections.join("")}
    </div>
    <footer class="footer">
      <a href="${escapeHtml(c.notionUrl)}" target="_blank" rel="noopener">Ver en Notion →</a><br>
      FX NetOps Team 2026 · <a href="mailto:noc@fiberx.net">noc@fiberx.net</a> · <a href="https://fiberx.net" target="_blank" rel="noopener">fiberx.net</a>
    </footer>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;function u(){var s=document.documentElement.getAttribute('data-theme');b.textContent=s==='dark'?'Modo claro':'Modo oscuro';}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
</body>
</html>`;
}

function buildIndexHtml(cases) {
  const timeInfos = cases.map((c) => computeTimeInfo(c));
  const statusColors = { Done: "#22c55e", "Fix Scheduled": "#f59e0b", "In progress": "#3b82f6", "Not started": "#6b7280", "Escalated to En...": "#ec4899", "Escalated to Engineering": "#ec4899" };
  const afectacionColors = { "Critical 🔥": "#dc2626", "High 🚨": "#ea580c", Normal: "#6b7280", Low: "#22c55e" };
  const cardsHtml = cases.map((c, i) => {
    const time = timeInfos[i];
    const baseName = `${String(i + 1).padStart(2, "0")}-${slug(c.caseName)}`;
    const htmlFilename = `${baseName}.html`;
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
      <h2 class="card-title"><a href="cases/${htmlFilename}">${escapeHtml(c.caseName)}</a></h2>
      <div class="card-meta">
        ${c.caseNumber ? `<span>Case <strong>${escapeHtml(c.caseNumber)}</strong></span>` : ""}
        ${c.createdDate ? `<span>${escapeHtml(c.createdDate)}</span>` : ""}
      </div>
      <div class="card-time">
        ${time.label ? `<span class="time-label">${escapeHtml(time.label)}</span>` : ""}
        ${time.subLabel ? `<span class="time-sublabel">${escapeHtml(time.subLabel)}</span>` : ""}
      </div>
      <div class="card-actions">
        <a href="cases/${htmlFilename}" class="btn btn-secondary">Ver detalle</a>
        <a href="${escapeHtml(c.notionUrl)}" target="_blank" rel="noopener" class="btn btn-link">Notion →</a>
      </div>
    </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Device Providers – Support Cases</title>
  <link rel="stylesheet" href="styles/report.css">
</head>
<body class="report-index">
  <script>
  (function(){var k='report-theme';var s=document.documentElement.getAttribute('data-theme')||localStorage.getItem(k)||(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',s);})();
  </script>
  <div class="container">
    <button type="button" id="theme-toggle" class="theme-toggle" aria-label="Cambiar modo claro u oscuro">Modo claro</button>
    <header>
      <h1>Device Providers – Support Cases</h1>
      <p>Reporte generado desde Notion (data/cases.json) para presentación a personas externas.</p>
      <div class="stats"><span>Total: <strong>${cases.length}</strong> casos</span></div>
    </header>
    <div class="grid">
${cardsHtml}
    </div>
    <footer class="footer">
      FX NetOps Team 2026 · <a href="mailto:noc@fiberx.net">noc@fiberx.net</a> · <a href="https://fiberx.net" target="_blank" rel="noopener">fiberx.net</a>
    </footer>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;function u(){var s=document.documentElement.getAttribute('data-theme');b.textContent=s==='dark'?'Modo claro':'Modo oscuro';}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
</body>
</html>`;
}

export { slug, sortCases, computeTimeInfo, buildReadme, buildCaseDetailHtml, buildIndexHtml, caseToMarkdown };
