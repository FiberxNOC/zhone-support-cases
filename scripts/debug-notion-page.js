#!/usr/bin/env node
/**
 * Muestra la estructura real de la primera página: nombres de propiedades
 * y tipos de bloque + texto. Ejecutar: node scripts/debug-notion-page.js
 * Revisa _debug-notion.txt para ver qué nombres usa Notion.
 */
import "dotenv/config";
import { Client } from "@notionhq/client";
import { writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const dbId = process.env.NOTION_DATABASE_ID;

async function getBlockText(block) {
  const d = block[block.type];
  if (!d?.rich_text) return "";
  return d.rich_text.map((t) => t.plain_text).join("");
}

async function main() {
  const { results } = await notion.databases.query({
    database_id: dbId,
    page_size: 1,
  });
  if (!results.length) {
    console.log("No hay páginas en la base.");
    return;
  }
  const page = results[0];
  const lines = [];

  lines.push("=== PROPIEDADES (nombres exactos que usa la API) ===\n");
  for (const [key, value] of Object.entries(page.properties || {})) {
    const type = value.type;
    let preview = "";
    if (value.title) preview = value.title.map((t) => t.plain_text).join("");
    else if (value.rich_text) preview = value.rich_text.map((t) => t.plain_text).join("");
    else if (value.select) preview = value.select?.name ?? "";
    else if (value.number !== undefined) preview = String(value.number);
    else if (value.date?.start) preview = value.date.start;
    const previewStr = typeof preview === "string" ? preview : String(preview ?? "");
    lines.push(`  "${key}" (tipo: ${type}) => ${previewStr.slice(0, 60)}`);
  }

  lines.push("\n=== BLOQUES DEL CONTENIDO (orden y texto) ===\n");
  let cursor;
  do {
    const { results: blocks, next_cursor } = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 50,
      start_cursor: cursor,
    });
    blocks.forEach((b, i) => {
      const raw = getBlockText(b);
      const text = typeof raw === "string" ? raw : String(raw ?? "");
      const preview = text.slice(0, 80);
      lines.push(`  ${i + 1}. ${b.type}: "${preview}${text.length >= 80 ? "…" : ""}"`);
    });
    cursor = next_cursor ?? null;
  } while (cursor);

  const outPath = join(ROOT, "_debug-notion.txt");
  await writeFile(outPath, lines.join("\n"), "utf8");
  console.log("Escrito:", outPath);
  console.log("Revisa ese archivo para ver los nombres exactos de propiedades y bloques.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
