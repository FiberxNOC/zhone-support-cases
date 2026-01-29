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
      label = daysOpen <= 0 ? "Closed same day" : `Closed in ${daysOpen} day${daysOpen !== 1 ? "s" : ""}`;
    } else {
      label = daysOpen <= 0 ? "Open today" : `Open for ${daysOpen} day${daysOpen !== 1 ? "s" : ""}`;
    }
  }
  if (due && !isDone) {
    const daysUntilDue = Math.floor((due - now) / msPerDay);
    if (daysUntilDue > 0) subLabel = `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`;
    else if (daysUntilDue === 0) subLabel = "Due today";
    else subLabel = `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""}`;
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
    if (!name || !String(name).trim()) continue; /* Notion a veces trae props sin nombre (ej. número suelto) */
    if (name === "Case Name") continue; /* ya es el título del caso, no mostrarlo como prop */
    if (name === "Status") continue; /* Status se muestra como badge a la derecha en el hero */
    const v = escapeHtml(String(value)).replace(/\n/g, "<br>");
    const valueCell =
      name === "Internal Ticket"
        ? `<span class="prop-value"><a href="${TICKET_VIEW_URL_BASE}${encodeURIComponent(String(value).trim())}" target="_blank" rel="noopener" class="prop-value-link">${v}</a></span>`
        : `<span class="prop-value">${v}</span>`;
    const row = `<div class="prop-row"><span class="prop-label">${escapeHtml(name)}</span>${valueCell}</div>`;
    if (["Case Number", "Internal Ticket"].includes(name)) id.push(row);
    else if (["Created Date", "Due Date"].includes(name)) fechas.push(row);
    else if (["Afectation", "Affectation", "Failure Type", "Provider"].includes(name)) clasif.push(row);
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

function buildReadme(cases, filenames = null) {
  const used = new Set();
  const getFilename = (c, i) => filenames ? filenames[i] : getCaseFilename(c, i, used);
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
    const filename = getFilename(c, i);
    const shortTitle = c.caseName.length > 70 ? c.caseName.slice(0, 70) + "…" : c.caseName;
    lines.push(`- [**${i + 1}.** ${shortTitle}](cases/${filename}) — ${c.status || "—"} · ${c.afectation || "—"}`);
  });
  lines.push("", "---", "", "## Índice de casos (tabla)", "",
    "| # | Case Name | Provider | Case # | Status | Affectation | Created |",
    "|---|-----------|----------|--------|--------|-------------|--------|",
  );
  cases.forEach((c, i) => {
    const filename = getFilename(c, i);
    const link = `[${c.caseName.slice(0, 50)}${c.caseName.length > 50 ? "…" : ""}](cases/${filename})`;
    lines.push(`| ${i + 1} | ${link} | ${c.provider || "—"} | ${c.caseNumber || "—"} | ${c.status || "—"} | ${c.afectation || "—"} | ${c.createdDate || "—"} |`);
  });
  lines.push("", "---", "", "*FiberX NetOps Team · [noc@fiberx.net](mailto:noc@fiberx.net) · [fiberx.net](https://fiberx.net) · 2026*", "");
  return lines.join("\n");
}

function buildCaseDetailHtml(c, index) {
  const time = computeTimeInfo(c);
  const statusColors = { Done: "#64748b", "Fix Scheduled": "#94a3b8", "In progress": "#2563eb", "Not started": "#94a3b8", "Escalated to En...": "#64748b", "Escalated to Engineering": "#64748b" };
  const afectacionColors = { "Critical 🔥": "#475569", "High 🚨": "#64748b", Normal: "#94a3b8", Low: "#cbd5e1" };
  const statusColor = statusColors[c.status] || "#6b7280";
  const statusIsOpen = ["In progress", "Not started", "Escalated to Engineering", "Escalated to En..."].includes(c.status);
  const afectColor = afectacionColors[c.afectation] || "#6b7280";
  const groups = groupProps(c.allProps);
  const dueWarning =
    c.dueDate && c.createdDate && new Date(c.dueDate) < new Date(c.createdDate)
      ? '<span class="due-warning">Overdue</span>'
      : time.subLabel ? `<span class="due-info">${escapeHtml(time.subLabel)}</span>` : "";
  const propBlock = (title, rows) =>
    rows.length ? `<div class="prop-group"><h3 class="prop-group-title">${escapeHtml(title)}</h3><div class="prop-list">${rows.join("")}</div></div>` : "";
  const resumenSection = c.resumen ? `<section class="detail-section"><h2 class="section-title">Summary</h2><div class="detail-content">${textToHtml(c.resumen)}</div></section>` : "";
  const notasSection = c.notas ? `<section class="detail-section"><h2 class="section-title">Notes</h2><div class="detail-content">${textToHtml(c.notas)}</div></section>` : "";
  const resumenNotasRow = resumenSection || notasSection ? `<div class="detail-row-2">${resumenSection}${notasSection}</div>` : "";
  const sections = [];
  if (c.detalleDelProblema) sections.push(`<section class="detail-section"><h2 class="section-title">Problem detail</h2><div class="detail-content">${textToHtml(c.detalleDelProblema)}</div></section>`);
  if (c.resolucion) sections.push(`<section class="detail-section"><h2 class="section-title">Resolution</h2><div class="detail-content">${textToHtml(c.resolucion)}</div></section>`);

  const caseLogoImg = '<img src="../logoheader-1.svg" alt="FiberX" class="logo-icon logo-icon-dark" width="168" height="52" loading="lazy" /><img src="../logoheader-light.svg" alt="FiberX" class="logo-icon logo-icon-light" width="168" height="52" loading="lazy" />';
  return `<!DOCTYPE html>
<html lang="es">
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
      <a href="../index.html" class="logo" aria-label="Volver al reporte">${caseLogoImg}</a>
      <a href="../index.html" class="back-link">← Volver al reporte</a>
      <button type="button" id="theme-toggle" class="theme-toggle theme-btn" aria-label="Cambiar a modo claro" title="Cambiar a modo claro"><i class="fa-solid fa-sun theme-btn-icon" aria-hidden="true"></i></button>
    </header>
    <div class="case-details">
      <header class="case-hero">
        <div class="case-hero-top">
          <div class="case-hero-top-left">
            ${c.caseNumber ? `<span class="case-num">Case #${escapeHtml(c.caseNumber)}</span>` : ""}
            ${c.internalTicket ? `<a href="${TICKET_VIEW_URL_BASE}${encodeURIComponent(String(c.internalTicket))}" target="_blank" rel="noopener" class="case-num ticket-link" title="Ver ticket en la plataforma">Ticket ${escapeHtml(c.internalTicket)}</a>` : ""}
            ${c.provider ? `<span class="badge" style="--badge-color:#6366f1">${escapeHtml(c.provider)}</span>` : ""}
            ${c.afectation ? `<span class="badge" style="--badge-color:${afectColor}">${escapeHtml(c.afectation)}</span>` : ""}
          </div>
          ${c.status ? `<span class="badge status-badge-hero ${statusIsOpen ? "status-badge--open" : "status-badge--done"}" style="--badge-color:${statusColor}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(c.status)}</span>` : ""}
        </div>
        <h1 class="case-title">${escapeHtml(c.caseName)}</h1>
        <div class="key-info">
          ${time.label ? `<span class="key-info-item"><strong>${escapeHtml(time.label)}</strong></span>` : ""}
          ${c.createdDate ? `<span class="key-info-item">Created: ${escapeHtml(c.createdDate)}</span>` : ""}
          ${c.dueDate ? `<span class="key-info-item">Due: ${escapeHtml(c.dueDate)}</span>` : ""}
          ${dueWarning ? `<span class="key-info-item">${dueWarning}</span>` : ""}
        </div>
      </header>
      <div class="props-grid">
        ${propBlock("Identification", groups.id)}
        ${propBlock("Dates", groups.fechas)}
        ${propBlock("Classification", groups.clasif)}
        ${propBlock("Device", groups.dispositivo)}
        ${propBlock("Other", groups.otros)}
      </div>
    </div>
    <div class="case-body">
      <div class="content-divider">Case content</div>
      ${resumenNotasRow}
      ${sections.join("")}
    </div>
    <div class="footer-wrap">
      <footer class="footer">
        <a href="${escapeHtml(c.notionUrl)}" target="_blank" rel="noopener">Ver en Notion →</a><br>
        FiberX NetOps Team · <a href="mailto:noc@fiberx.net">noc@fiberx.net</a> · <a href="https://fiberx.net" target="_blank" rel="noopener">fiberx.net</a> · 2026
      </footer>
    </div>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;var icon=b.querySelector('.theme-btn-icon');function u(){var s=document.documentElement.getAttribute('data-theme');var isDark=s==='dark';b.setAttribute('aria-label',isDark?'Cambiar a modo claro':'Cambiar a modo oscuro');b.setAttribute('title',isDark?'Cambiar a modo claro':'Cambiar a modo oscuro');if(icon){icon.className='theme-btn-icon fa-solid '+(isDark?'fa-sun':'fa-moon');}}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
  </script>
  <button type="button" id="scroll-top-btn" class="scroll-top-btn" aria-label="Subir" title="Subir"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>
  <script>
  (function(){var btn=document.getElementById('scroll-top-btn');if(!btn)return;function onScroll(){btn.classList.toggle('is-visible',(window.scrollY||document.documentElement.scrollTop)>400);}window.addEventListener('scroll',onScroll,{passive:true});onScroll();btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});})();
  </script>
</body>
</html>`;
}

function buildIndexHtml(cases, filenames = null) {
  const used = new Set();
  const getFilename = (c, i) => filenames ? filenames[i] : getCaseFilename(c, i, used);
  const timeInfos = cases.map((c) => computeTimeInfo(c));
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
  const platforms = [...new Set(cases.map((c) => c.platform).filter(Boolean))].sort();
  const models = [...new Set(cases.map((c) => c.model).filter(Boolean))].sort();
  const firmwares = [...new Set(cases.map((c) => c.firmwareVersion).filter(Boolean))].sort();
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
    const platform = c.platform || "";
    const model = c.model || "";
    const fw = c.firmwareVersion || "";
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
      <h2 class="card-title"><a href="cases/${htmlFilename}" title="${escapeHtml(c.caseName)}">${escapeHtml(c.caseName)}</a></h2>
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
        <a href="cases/${htmlFilename}" class="btn btn-secondary">Ver detalle</a>
      </div>
    </article>`;
  }).join("");

  const logoImg = `<img src="logoheader-1.svg" alt="FiberX" class="logo-icon logo-icon-dark" width="168" height="52" loading="lazy" /><img src="logoheader-light.svg" alt="FiberX" class="logo-icon logo-icon-light" width="168" height="52" loading="lazy" />`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Device Providers – Support Cases | FiberX</title>
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
      <a href="https://gofiberx.com" class="logo" target="_blank" rel="noopener" aria-label="FiberX – Ir al sitio oficial">${logoImg}</a>
      <button type="button" id="theme-toggle" class="theme-toggle theme-btn" aria-label="Cambiar a modo claro" title="Cambiar a modo claro"><i class="fa-solid fa-sun theme-btn-icon" aria-hidden="true"></i></button>
    </header>
    <main class="main-content">
    <header>
      <h1>Device Providers – Support Cases</h1>
      <p>Reporte generado desde Notion (data/cases.json) para presentación a personas externas.</p>
      <div class="stats"><span>Total: <strong>${cases.length}</strong> casos</span><span id="filter-count" class="filter-count"></span></div>
    </header>
    <div class="toolbar-row">
    <div class="filters-wrap">
      <button type="button" id="filter-toggle" class="filter-toggle" aria-expanded="false" aria-controls="filter-panel" aria-label="Mostrar u ocultar filtros">
        <i class="fa-solid fa-sliders" aria-hidden="true"></i>
        <span>Filtros</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="filter-panel" class="filter-panel" role="region" aria-label="Filtros de casos">
        <div class="filters">
          <div class="filter-group">
            <label for="filter-status"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Estado</label>
            <select id="filter-status" class="filter-select" aria-label="Filtrar por estado">
              <option value="">Todos</option>${filterStatusOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-afectation"><i class="fa-solid fa-bolt" aria-hidden="true"></i> Afectación</label>
            <select id="filter-afectation" class="filter-select" aria-label="Filtrar por afectación">
              <option value="">Todas</option>${filterAfectOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-provider"><i class="fa-solid fa-building" aria-hidden="true"></i> Provider</label>
            <select id="filter-provider" class="filter-select" aria-label="Filtrar por provider">
              <option value="">Todos</option>${filterProviderOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-platform"><i class="fa-solid fa-server" aria-hidden="true"></i> Platform</label>
            <select id="filter-platform" class="filter-select" aria-label="Filtrar por platform">
              <option value="">Todas</option>${filterPlatformOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-model"><i class="fa-solid fa-cube" aria-hidden="true"></i> Model</label>
            <select id="filter-model" class="filter-select" aria-label="Filtrar por model">
              <option value="">Todos</option>${filterModelOptions}
            </select>
          </div>
          <div class="filter-group">
            <label for="filter-firmware"><i class="fa-solid fa-code-branch" aria-hidden="true"></i> FW</label>
            <select id="filter-firmware" class="filter-select" aria-label="Filtrar por firmware">
              <option value="">Todas</option>${filterFirmwareOptions}
            </select>
          </div>
          <button type="button" id="filter-clear" class="btn btn-filter-clear" aria-label="Quitar todos los filtros">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Quitar
          </button>
        </div>
      </div>
    </div>
    <div class="columns-wrap">
      <button type="button" id="columns-toggle" class="filter-toggle" aria-expanded="false" aria-controls="columns-panel" aria-label="Mostrar u ocultar opciones de columnas">
        <i class="fa-solid fa-table-columns" aria-hidden="true"></i>
        <span>Qué mostrar</span>
        <i class="fa-solid fa-chevron-down filter-toggle-chevron" aria-hidden="true"></i>
      </button>
      <div id="columns-panel" class="filter-panel" role="region" aria-label="Propiedades visibles en tarjetas">
        <div class="columns-options">
          <label class="column-option"><input type="checkbox" id="col-badges" data-card-prop="badges" checked> <span>Badges</span></label>
          <label class="column-option"><input type="checkbox" id="col-cardMeta" data-card-prop="cardMeta" checked> <span>Case & fecha</span></label>
          <label class="column-option"><input type="checkbox" id="col-status" data-card-prop="status" checked> <span>Status</span></label>
          <label class="column-option"><input type="checkbox" id="col-platform" data-card-prop="platform" checked> <span>Platform</span></label>
          <label class="column-option"><input type="checkbox" id="col-model" data-card-prop="model" checked> <span>Model</span></label>
          <label class="column-option"><input type="checkbox" id="col-firmware" data-card-prop="firmware" checked> <span>FW</span></label>
          <label class="column-option"><input type="checkbox" id="col-time" data-card-prop="time" checked> <span>Tiempo</span></label>
          <label class="column-option"><input type="checkbox" id="col-actions" data-card-prop="actions" checked> <span>Acciones</span></label>
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
        FiberX NetOps Team · <a href="mailto:noc@fiberx.net">noc@fiberx.net</a> · <a href="https://gofiberx.com" target="_blank" rel="noopener">gofiberx.com</a> · 2026
      </footer>
    </div>
  </div>
  <script>
  (function(){var k='report-theme';var b=document.getElementById('theme-toggle');if(!b)return;var icon=b.querySelector('.theme-btn-icon');function u(){var s=document.documentElement.getAttribute('data-theme');var isDark=s==='dark';b.setAttribute('aria-label',isDark?'Cambiar a modo claro':'Cambiar a modo oscuro');b.setAttribute('title',isDark?'Cambiar a modo claro':'Cambiar a modo oscuro');if(icon){icon.className='theme-btn-icon fa-solid '+(isDark?'fa-sun':'fa-moon');}}u();b.addEventListener('click',function(){var s=document.documentElement.getAttribute('data-theme');s=s==='dark'?'light':'dark';localStorage.setItem(k,s);document.documentElement.setAttribute('data-theme',s);u();});})();
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
    function updateCount(visible){countEl.textContent=visible<total?' · Mostrando '+visible+' de '+total:'';}
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
  <button type="button" id="scroll-top-btn" class="scroll-top-btn" aria-label="Subir" title="Subir"><i class="fa-solid fa-chevron-up" aria-hidden="true"></i></button>
  <script>
  (function(){var btn=document.getElementById('scroll-top-btn');if(!btn)return;function onScroll(){btn.classList.toggle('is-visible',(window.scrollY||document.documentElement.scrollTop)>400);}window.addEventListener('scroll',onScroll,{passive:true});onScroll();btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});})();
  </script>
</body>
</html>`;
}

/** HTML completo para exportar a PDF (un solo documento con índice + todos los casos) */
function buildPdfHtml(cases) {
  const dateStr = new Date().toLocaleDateString("es", { day: "2-digit", month: "long", year: "numeric" });
  const tableRows = cases
    .map(
      (c, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(c.caseName)}</td><td>${escapeHtml(c.caseNumber || "—")}</td><td>${escapeHtml(c.provider || "—")}</td><td>${escapeHtml(c.status || "—")}</td><td>${escapeHtml(c.afectation || "—")}</td><td>${escapeHtml(c.createdDate || "—")}</td></tr>`
    )
    .join("");

  const caseSections = cases
    .map((c, i) => {
      const time = computeTimeInfo(c);
      const propsRows =
        c.allProps &&
        Object.entries(c.allProps)
          .filter(([, v]) => v != null && String(v).trim())
          .map(([name, value]) => `<tr><td class="prop-name">${escapeHtml(name)}</td><td>${escapeHtml(String(value)).replace(/\n/g, "<br>")}</td></tr>`)
          .join("");
      const resumen = c.resumen ? `<div class="block"><h3>Summary</h3>${textToHtml(c.resumen)}</div>` : "";
      const notas = c.notas ? `<div class="block"><h3>Notes</h3>${textToHtml(c.notas)}</div>` : "";
      const detalle = c.detalleDelProblema ? `<div class="block"><h3>Problem detail</h3>${textToHtml(c.detalleDelProblema)}</div>` : "";
      const resolucion = c.resolucion ? `<div class="block"><h3>Resolution</h3>${textToHtml(c.resolucion)}</div>` : "";
      return `
  <section class="case-section">
    <h2>${i + 1}. ${escapeHtml(c.caseName)}</h2>
    <p class="case-meta">${c.caseNumber ? `Case #${escapeHtml(c.caseNumber)}` : ""} ${c.internalTicket ? ` · Ticket ${escapeHtml(c.internalTicket)}` : ""} · ${escapeHtml(c.status || "")} · ${escapeHtml(c.afectation || "")} · ${time.label ? escapeHtml(time.label) : ""} · Created: ${escapeHtml(c.createdDate || "—")}${c.dueDate ? ` · Due: ${escapeHtml(c.dueDate)}` : ""}</p>
    ${propsRows ? `<table class="props-table"><tbody>${propsRows}</tbody></table>` : ""}
    ${resumen}${notas}${detalle}${resolucion}
  </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Device Providers – Support Cases</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #111; margin: 0; padding: 1.5cm; }
    h1 { font-size: 18px; margin: 0 0 0.5em; }
    h2 { font-size: 14px; margin: 1.2em 0 0.4em; page-break-after: avoid; }
    h3 { font-size: 11px; margin: 0.8em 0 0.3em; color: #333; page-break-after: avoid; }
    p { margin: 0 0 0.5em; }
    .report-date { color: #555; margin-bottom: 1em; }
    table { width: 100%; border-collapse: collapse; margin: 0.5em 0; font-size: 10px; page-break-inside: avoid; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    .case-section { page-break-before: always; }
    .case-section:first-of-type { page-break-before: auto; }
    .case-meta { color: #555; font-size: 10px; margin-bottom: 0.6em; }
    .props-table .prop-name { font-weight: 500; color: #444; width: 35%; }
    .block { margin-bottom: 1em; page-break-inside: avoid; }
    .block p { margin-bottom: 0.4em; }
    .footer { margin-top: 2em; padding-top: 0.5em; font-size: 9px; color: #666; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Device Providers – Support Cases</h1>
  <p class="report-date">Reporte generado el ${dateStr}. Total: ${cases.length} casos.</p>
  <table>
    <thead><tr><th>#</th><th>Case Name</th><th>Case #</th><th>Provider</th><th>Status</th><th>Affectation</th><th>Created</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${caseSections}
  <div class="footer">FiberX NetOps Team · noc@fiberx.net · fiberx.net · 2026</div>
</body>
</html>`;
}

export { slug, sortCases, computeTimeInfo, getCaseFilename, buildReadme, buildCaseDetailHtml, buildIndexHtml, buildPdfHtml, caseToMarkdown };
