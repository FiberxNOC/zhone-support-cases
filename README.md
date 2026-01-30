# Device Providers – Support Cases

Reporte de casos de soporte de Device Providers, generado desde una base de datos de Notion. Incluye vista web (índice y detalle por caso) y generación de PDF para compartir.

## Requisitos

- Node.js (v18+)
- Cuenta Notion con la base **device-providers-support-cases** y una integración con acceso a ella

## Instalación

```bash
npm install
cp .env.example .env
npm run check
```

## Comandos

| Comando | Descripción |
|--------|-------------|
| `npm run sync` | Descarga casos de Notion y guarda `data/cases.json` |
| `npm run build` | Genera `REPORT.md`, `index.html` y `cases/*.html` desde los datos |
| `npm run report` | Ejecuta sync y luego build |
| `npm run pdf` | Genera `report.pdf` (portada, índice, resumen y todos los casos) |
| `npm run serve` | Servidor local (por defecto http://localhost:3000); en la página hay un botón **Generar PDF** que descarga el reporte |
| `npm run verify` | Valida `data/cases.json`; con `--build` también ejecuta build y comprueba salida |
| `npm run test` | Igual que `verify --build` |

## Salida

- **data/cases.json**: datos crudos (fuente local)
- **REPORT.md**: listado de casos en Markdown
- **index.html**: reporte web con filtros y tarjetas por caso
- **cases/*.html**: una página por caso
- **report.pdf**: documento único para enviar por email (requiere Puppeteer; usa Chromium embebido, no el navegador del sistema)

## Publicar

Tras `npm run report` (o `sync` + `build`), sube los archivos generados. No subas `.env` (está en `.gitignore`).

## Variables de entorno (.env)

- **NOTION_API_KEY**: token de la integración de Notion (`secret_...`)
- **NOTION_DATABASE_ID**: ID de la base de datos (32 caracteres, en la URL de la base en Notion)

---

*FiberX NetOps Team*

