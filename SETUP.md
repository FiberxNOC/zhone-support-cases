# Configuración y generación del reporte

Este repositorio se genera a partir de la base de datos **device-providers-support-cases** de Notion. Para regenerar el reporte o configurarlo en otra máquina:

## 1. Crear una integración en Notion

1. Entra en [Notion Integrations](https://www.notion.so/my-integrations).
2. Crea una nueva integración (por ejemplo: "Support Cases Report").
3. Copia el **Internal Integration Token** (empieza por `secret_`).

## 2. Compartir la base de datos con la integración

1. Abre la base de datos **device-providers-support-cases** en Notion.
2. Menú **⋯** (arriba a la derecha) → **Add connections**.
3. Elige la integración que creaste.

## 3. Obtener el ID de la base de datos

El **Database ID** está en la URL de la base cuando la abres en el navegador:

- URL típica: `https://www.notion.so/workspace/XXXXXXXXXXXX?v=...`
- El ID es la parte de 32 caracteres (con o sin guiones): `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## 4. Configurar el proyecto

```bash
cp .env.example .env
```

Edita `.env` y rellena:

- `NOTION_API_KEY`: el token de la integración.
- `NOTION_DATABASE_ID`: el ID de la base de datos.

## 5. Probar la conexión

```bash
npm install
npm run check
```

Si todo está bien verás `✅ Conexión correcta`. Si falta algo, el script te indicará qué revisar.

## 5.1 Propiedades recomendadas en la base de Notion

Para que en las tarjetas y filtros aparezcan **Status**, **Platform**, **Model** y **Firmware Version**, la base debe tener columnas con esos nombres (o similares: "Firmware", "FW", "Patform" se reconocen). Si faltan, en la página se mostrará "—". El sync intenta leer variantes de nombre (p. ej. "Firmware" además de "Firmware Version").

## 6. Generar el reporte

- **`npm run sync`**: descarga los casos de Notion y guarda **data/cases.json** (fuente de verdad local). Por defecto procesa varios casos en paralelo para ir más rápido. Si Notion devuelve errores de límite de tasa, prueba `SYNC_CONCURRENCY=2 npm run sync`.
- **`npm run build`**: lee **data/cases.json** y genera README.md, index.html y cases/*.html.
- **`npm run report`**: ejecuta sync y luego build (pipeline completo).
- **`npm run pdf`**: genera **report.pdf** (índice + todos los casos) para adjuntar en un email. Requiere tener data/cases.json y `npm install` con puppeteer.

```bash
npm run report
```

Se generan:

- **data/cases.json**: datos crudos de Notion (para no depender de la API en cada build).
- **README.md**: índice del reporte con tabla de casos (ideal para GitHub).
- **index.html**: vista web con fichas por caso, badges de Status/Provider/Afectación y tiempo calculado. Ábrelo en el navegador para ver el reporte visual.
- **cases/**: un HTML por caso (la página de detalle se construye desde el JSON).

### PDF para email

Para obtener un único PDF con el reporte completo (índice + todos los casos) y adjuntarlo a un email:

```bash
npm run pdf
```

Se genera **report.pdf** en la raíz del proyecto. La primera vez que ejecutes `npm run pdf`, Puppeteer descargará su propio **Chromium** (incluido en el paquete npm). **No se usa tu navegador** (da igual que uses Firefox, Safari, Edge, etc.): el PDF se genera con un Chromium headless que instala Puppeteer, independiente del navegador que tengas por defecto.

Por defecto **la portada y la página del índice no llevan pie de página** (se tapa con un rectángulo blanco). El resto del documento sí lleva pie. Los enlaces del índice (a cada caso y al resumen) deberían funcionar. Si en tu entorno los enlaces dejan de funcionar, prueba `ENABLE_FOOTER_COVER=0 npm run pdf` para no tapar el pie (el footer se verá en todas las páginas).

### Comprobar que todo funciona

Para validar que **data/cases.json** es correcto y que el build genera los archivos esperados:

```bash
npm run verify          # Solo valida data/cases.json
npm run verify -- --build   # Valida JSON, ejecuta build y comprueba index.html y cases/*.html
npm run test            # Igual que verify --build (prueba completa)
```

Si algo falla (JSON inválido, casos sin `lastEditedTime`, archivos de caso faltantes u obsoletos), el script indica el error y termina con código 1.

## Orden del reporte

Los casos se ordenan para la presentación a externos así:

1. **Estado**: Not started → In progress → Escalated → Fix Scheduled → Done.
2. **Afectación**: Critical 🔥 → High 🚨 → Normal → Low.
3. **Fecha de creación**: más recientes primero.

Si quieres otro orden, edita `STATUS_ORDER` y `AFECTATION_ORDER` en **scripts/report-utils.js**.

## Subir a GitHub

Después de `npm run report` (o `npm run sync` + `npm run build`):

```bash
git add data/ README.md index.html cases/
git commit -m "Actualizar reporte de casos desde Notion"
git push
```

No subas el archivo `.env` (ya está en `.gitignore`).
