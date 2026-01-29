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

## 6. Generar el reporte

```bash
npm run sync
```

Se generan:

- **README.md**: índice del reporte con tabla de casos (ideal para GitHub).
- **index.html**: vista web con fichas por caso, badges de Status/Provider/Afectación y tiempo calculado (abierto hace X días / cerrado en X días / vence en X días). Ábrelo en el navegador para ver el reporte visual.
- **cases/**: un archivo Markdown por caso, con todos los campos.

## Orden del reporte

Los casos se ordenan para la presentación a externos así:

1. **Estado**: Not started → In progress → Escalated → Fix Scheduled → Done.
2. **Afectación**: Critical 🔥 → High 🚨 → Normal → Low.
3. **Fecha de creación**: más recientes primero.

Si quieres otro orden, puedes editar `STATUS_ORDER` y `AFECTATION_ORDER` en `scripts/sync-from-notion.js`.

## Subir a GitHub

Después de `npm run sync`:

```bash
git add README.md cases/
git commit -m "Actualizar reporte de casos desde Notion"
git push
```

No subas el archivo `.env` (ya está en `.gitignore`).
