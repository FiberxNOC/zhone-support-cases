# Tareas pendientes

## [PENDIENTE] Props de Notion: solo cargan 9 en lugar de 16

**Estado:** Por verificar / pendiente de seguir trabajando.

**Qué pasa:** En Notion se ven 16 propiedades por caso (No, Provider, Case Number, Status, Created Date, Due Date, Failure Type, Affectation, Internal Ticket, Device, Model, Firmware Version, Created by, Last edited by, Platform, Serial Number), pero en el reporte la línea "Propiedades cargadas en este caso" muestra **9** (Afectation, Case Number, Created by, Created Date, Due Date, Failure Type, Last edited by, Model, No).

**Qué falta:** Las que no aparecen son: **Provider**, **Platform**, **Device**, **Firmware Version**, **Serial Number**, **Internal Ticket** (Status se oculta a propósito en el hero).

**Contexto técnico:**
- El sync usa `getAllPropsFromSchema(db, page)` (por ID) y `getPropBySchemaName(page, db, [...])` (por nombre).
- Se añadió enriquecer `allProps` en el sync con los valores de Provider, Platform, Model, Device, Serial Number, Internal Ticket, Firmware Version.
- Aun así, tras `npm run sync` y `npm run build`, el caso 132099 (y otros) siguen mostrando 9 props.
- Posibles causas a revisar:
  1. La API de Notion devuelve `page.properties` con estructura distinta (IDs que no coinciden con `db.properties`).
  2. Props tipo Select/Status no se están leyendo bien para ese caso.
  3. Necesidad de loguear en el sync qué devuelve la API para cada página (props keys, tipos, valores).

**Pasos sugeridos para retomar:**
1. Añadir en `sync-from-notion.js` un log (solo en desarrollo) de `Object.keys(page.properties)` y, para una página concreta (ej. 132099), de `db.properties` vs `page.properties` para ver si los IDs coinciden.
2. Comprobar si `getPropValue(raw)` devuelve valor para select/status en esa página.
3. Si hace falta, probar a pedir la página con `notion.pages.retrieve({ page_id })` además del query de la base, para ver si las props vienen más completas.

---

*Última actualización: para retomar cuando se pueda verificar con sync real y/o logs de la API.*
