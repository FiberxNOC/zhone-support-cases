#!/usr/bin/env node
/**
 * Genera report.pdf: portada + cuerpo (índice, resumen, casos) en un solo documento.
 *
 * La portada (p.1) y el índice (p.2) NO llevan pie de página: se tapa con un rectángulo
 * blanco (pdf-lib) para que no se vea el footer en esas páginas. El resto del documento sí lleva pie.
 *
 * Si los enlaces del índice dejan de funcionar, se puede probar ENABLE_FOOTER_COVER=0 para
 * no tapar el pie (el footer se verá en todas las páginas pero los enlaces podrían funcionar).
 *
 * Usa Puppeteer con su Chromium embebido (no el navegador del sistema).
 */
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { sortCases, buildPdfFullHtml, getTocEntryIds } from "./report-utils.js";
import { PDFDocument, rgb } from "pdf-lib";

/** Si es "0", NO se tapa el pie en p.1 y p.2 (footer visible en todas las páginas; por defecto sí tapamos). */
const ENABLE_FOOTER_COVER = process.env.ENABLE_FOOTER_COVER !== "0";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_FILE = join(ROOT, "data", "cases.json");
const PDF_PATH = join(ROOT, "report.pdf");
const LOGO_PATH = join(ROOT, "logoheader-light.svg");

/** Altura aproximada de una página A4 en horizontal (contenido en px, 210mm - márgenes, ~96dpi) */
const PAGE_CONTENT_HEIGHT_PX = 718;

async function getLogoDataUrl() {
  try {
    const svg = await readFile(LOGO_PATH, "utf8");
    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return "";
  }
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
    console.error("data/cases.json está vacío o no es un array. Ejecuta: npm run sync");
    process.exit(1);
  }

  const sorted = sortCases(cases);
  const logoDataUrl = await getLogoDataUrl();

  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch (err) {
    console.error("Puppeteer no está instalado. Ejecuta: npm install puppeteer");
    process.exit(1);
  }

  const footerTemplate = `
    <div style="padding: 0 0.6cm; width: 100%; box-sizing: border-box; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
      <table style="width: 100%; font-size: 8px; color: #666; border: none; font-family: inherit;">
        <tr><td style="text-align: left; width: 50%;">FiberX NetOps Team | Información confidencial</td>
        <td style="text-align: right; width: 50%;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></td></tr>
      </table>
    </div>`;

  console.log("Generando PDF…");
  const browser = await puppeteer.default.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1122, height: 794 }); // A4 horizontal @ 96dpi

    // Primera pasada: documento completo sin números en el índice para obtener posiciones
    const fullHtmlFirst = buildPdfFullHtml(sorted, logoDataUrl, {});
    await page.setContent(fullHtmlFirst, { waitUntil: "networkidle0" });

    const tocEntries = getTocEntryIds(sorted);
    const tocPageNumbers = {};
    for (const e of tocEntries) {
      const y = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return rect.top + window.pageYOffset;
      }, e.id);
      if (y != null) {
        const pageNum = 1 + Math.floor(y / PAGE_CONTENT_HEIGHT_PX);
        tocPageNumbers[e.id] = pageNum;
      }
    }

    // Un solo PDF con pie; sin post-procesado los enlaces del índice se preservan
    const fullHtmlFinal = buildPdfFullHtml(sorted, logoDataUrl, tocPageNumbers);
    await page.setContent(fullHtmlFinal, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      margin: { top: "0.8cm", right: "0.8cm", bottom: "1.2cm", left: "0.8cm" },
      printBackground: true,
      displayHeaderFooter: true,
      footerTemplate: footerTemplate.trim(),
    });

    // Tapar el pie en p.1 (portada) y p.2 (índice) para que no se vea el footer
    let finalPdfBytes = pdfBuffer;
    if (ENABLE_FOOTER_COVER) {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const { width } = pages[0].getSize();
      const footerHeightPt = 30;
      for (let i = 0; i < Math.min(2, pages.length); i++) {
        pages[i].drawRectangle({
          x: 0,
          y: 0,
          width,
          height: footerHeightPt,
          color: rgb(1, 1, 1),
        });
      }
      finalPdfBytes = await pdfDoc.save();
    }
    await writeFile(PDF_PATH, finalPdfBytes);
  } finally {
    await browser.close();
  }

  console.log(`Listo: ${PDF_PATH}`);
  console.log("Puedes adjuntar report.pdf a un email.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
