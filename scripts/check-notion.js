#!/usr/bin/env node
/**
 * Comprueba que NOTION_API_KEY y NOTION_DATABASE_ID estén configurados
 * y que la integración tenga acceso a la base de datos.
 */
import "dotenv/config";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log("Comprobando configuración…\n");

if (!NOTION_API_KEY || NOTION_API_KEY === "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
  console.error("❌ Falta NOTION_API_KEY en .env");
  console.error("   1. Copia .env.example a .env:  cp .env.example .env");
  console.error("   2. Crea una integración en https://www.notion.so/my-integrations");
  console.error("   3. Pega el token (secret_…) en .env como NOTION_API_KEY");
  process.exit(1);
}

if (!NOTION_DATABASE_ID || NOTION_DATABASE_ID.includes("xxxx")) {
  console.error("❌ Falta NOTION_DATABASE_ID en .env");
  console.error("   Abre la base 'device-providers-support-cases' en Notion.");
  console.error("   El ID está en la URL (32 caracteres, con o sin guiones).");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_KEY });

try {
  const db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
  console.log("✅ Conexión correcta.");
  console.log(`   Base: ${db.title?.[0]?.plain_text ?? "device-providers-support-cases"}`);
  console.log("\nPara generar el reporte ejecuta:");
  console.log("   npm run sync\n");
} catch (err) {
  if (err.code === "object_not_found" || err.status === 404) {
    console.error("❌ No se encontró la base de datos o no tiene acceso.");
    console.error("   En Notion: menú ⋯ de la base → Add connections → elige tu integración.");
  } else {
    console.error("❌ Error:", err.message);
  }
  process.exit(1);
}
