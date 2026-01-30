#!/usr/bin/env node
/**
 * Servidor local para la página del reporte.
 * Sirve los estáticos y expone GET /api/generate-pdf para generar y descargar report.pdf.
 */
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PDF_PATH = join(ROOT, "report.pdf");
const BUILD_PDF_SCRIPT = join(ROOT, "scripts", "build-pdf-report.js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(ROOT, { index: "index.html" }));

app.get("/api/generate-pdf", async (_req, res) => {
  try {
    const child = spawn("node", [BUILD_PDF_SCRIPT], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.stdout?.on("data", () => {});
    const code = await new Promise((resolve) => child.on("close", resolve));
    if (code !== 0) {
      res.status(500).type("text/plain").send(stderr || `Script salió con código ${code}`);
      return;
    }
    const pdf = await readFile(PDF_PATH);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="report.pdf"');
    res.send(pdf);
  } catch (err) {
    res.status(500).type("text/plain").send(err.message || "Error generando PDF");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log("Generar PDF: GET /api/generate-pdf o botón en la página.");
});
