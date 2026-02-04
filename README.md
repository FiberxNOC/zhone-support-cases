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
| `npm run translate` | Traduce contenido (ES→EN) con IA. **Solo traduce casos nuevos o modificados** (usa `lastEditedTime`). `TRANSLATE_FORCE=1` para forzar re-traducción completa. |
| `npm run correct-spelling` | Corrige ortografía en resumen, notas, detalle y resolución. **Solo corrige casos no corregidos** (manifest en `data/corrected-spelling.json`). `CORRECT_SPELLING_FORCE=1` para forzar. |
| `npm run build` | Genera reporte ES/EN. **Se omite si los datos no han cambiado** (hash en `data/.build-hash`). `BUILD_FORCE=1` para forzar. |
| `npm run report` | Ejecuta sync y luego build |
| `npm run report:all` | sync + translate + build + pdf (reporte completo en ES e EN) |
| `npm run pdf` | Genera PDF(s). **Se omiten si el PDF ya es más reciente que los datos.** `BUILD_PDF_FORCE=1` para forzar. |
| `npm run serve` | Servidor local (por defecto http://localhost:3000) |
| `npm run verify` | Valida `data/cases.json`; con `--build` también ejecuta build y comprueba salida |
| `npm run test` | Igual que `verify --build` |

## Salida

- **data/cases.json**: datos crudos en español (fuente local)
- **data/cases-en.json**: datos traducidos al inglés (generado por `npm run translate`)
- **REPORT.md** / **REPORT-en.md**: listado de casos en Markdown (ES / EN)
- **index.html** / **index-en.html**: reporte web con filtros y tarjetas (ES / EN)
- **cases/*.html** / **cases-en/*.html**: una página por caso (ES / EN)
- **report.pdf** / **report-en.pdf**: documento único para enviar por email (requiere Puppeteer)

## Publicar

Tras `npm run report` (o `sync` + `build`), sube los archivos generados. No subas `.env` (está en `.gitignore`).

## Variables de entorno (.env)

- **NOTION_API_KEY**: token de la integración de Notion (`secret_...`)
- **NOTION_DATABASE_ID**: ID de la base de datos (32 caracteres, en la URL de la base en Notion)
- **TRANSLATE_AI_PROVIDER** (opcional): `ollama` (por defecto) o `openai`
- **OLLAMA_BASE_URL** (opcional): URL de Ollama (por defecto `http://localhost:11434`). Necesitas [Ollama](https://ollama.com) instalado y un modelo (ej. `ollama pull llama3.2`).
- **OLLAMA_MODEL** (opcional): modelo a usar (por defecto `llama3.2`)
- **OPENAI_API_KEY** (opcional): solo si usas `TRANSLATE_AI_PROVIDER=openai`
- **OPENAI_MODEL** (opcional): modelo OpenAI (por defecto `gpt-4o-mini`)
- **TRANSLATE_DELAY_MS** (opcional): pausa entre peticiones en ms (por defecto 300)

---

*FiberX NetOps Team*

