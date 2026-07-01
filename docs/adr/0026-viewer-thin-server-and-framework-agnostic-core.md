# ADR 0026 — Viewer: thin local HTTP adapter, framework-agnostic Core, no new runtime dependency

- **Estado**: Aceptado
- **Fecha**: 2026-06-30
- **Contexto**: `009-design-system-viewer` agrega la primera capa de UI real sobre el Core headless
  (`001`–`008`). Debía decidirse cómo se renderiza (app estática vs. servidor local vs. embebido en el
  futuro Studio), sin violar los guardrails 1–5 (`Core` headless-first, sin React/browser en el Core,
  `CLI`/`MCP`/`Studio` reusan los mismos casos de uso, la UI es cliente no autoridad, filesystem detrás de
  puertos) ni el Principio V de la constitución (independencia de framework).

## Decisión

1. El Viewer se ejecuta como (a) un adaptador local `node:http`-only (sin framework de servidor) que sirve
   un bundle estático **pre-construido** y (b) expone una API JSON de **solo lectura** (`GET` únicamente)
   respaldada 1:1 por la capa de aplicación del Viewer (`ViewerXxxV1`). El bundle estático se construye una
   sola vez, en el `npm run build` de los mantenedores — nunca se regenera por invocación del usuario
   (evita que "renderizar" implique escribir archivos, lo que violaría el invariante de cero escrituras).
2. `src/application/viewer/**` (la capa de aplicación del Viewer, conceptual en `009`) depende
   exclusivamente de los puertos/tipos públicos ya existentes de `002`–`008`; no importa `node:http`, DOM,
   Commander ni ningún puerto de escritura. Solo `src/infrastructure/viewer/**` (el servidor y el bundle
   de UI) puede conocer el servidor/DOM.
3. No se agrega ninguna dependencia nueva a `package.json.dependencies`. La UI del Viewer es TypeScript
   vanilla sobre DOM (sin React/Vue/Svelte como dependencia de runtime del paquete instalado). Si el
   empaquetado del bundle estático requiere un bundler, se agrega como `devDependency` de uso exclusivo de
   los mantenedores, nunca instalada por un usuario final del CLI.
4. No se crea un paquete de dominio nuevo (`src/domain/viewer/`): todo concepto que el Viewer necesita ya
   existe como tipo de dominio en `002`–`008`; el Viewer solo agrega proyecciones/tipos de aplicación
   (`ViewerXxxV1`) con proveniencia trazable campo a campo.
5. Los contratos JSON del Viewer (`ViewerJsonEnvelopeV1`) son independientes del envelope de `003` y de los
   de `006`/`007`/`008`; nunca extienden un contrato cerrado.

## Consecuencias

- Un consumidor MCP/agente o la futura Studio pueden reusar exactamente la misma API JSON de solo lectura
  que la UI del Viewer consume, sin una segunda fuente de comportamiento (guardrail 3, Principio XV).
- El paquete `@neuraz/design-system-manager` no gana peso de instalación para usuarios que nunca ejecutan
  `neuraz-ds view`, y no se compromete de antemano con una elección de framework de UI que pudiera
  contradecir la dirección futura del Studio completo (`docs/product/vision.md` §4).
- Al no escribir el bundle en tiempo de ejecución, el Viewer puede cumplir el invariante de cero escrituras
  sin excepción, incluso al "renderizar".
- Costo aceptado: el equipo mantenedor debe incluir el paso de build del bundle estático en su propio
  pipeline de release (análogo a cómo ya se compila `dist/cli/index.js`); no es un costo nuevo en
  naturaleza, solo en alcance.
- Una futura embebida en Studio puede envolver o proxysar este mismo servidor local sin rediseño, dado que
  ya expone una API JSON de solo lectura desacoplada de su propia UI.

## Alternativas consideradas

- **Export estático regenerado por invocación**: rechazado — escribiría archivos en cada `neuraz-ds view`,
  violando el invariante de cero escrituras.
- **Servidor con un framework web completo (p. ej. Express/Fastify) como dependencia runtime**: rechazado
  para v1 — `node:http` puro es suficiente para servir un bundle estático + una API `GET`-only, y evita una
  dependencia runtime nueva.
- **Adoptar React/Vue como dependencia runtime ahora**: rechazado — compromete una elección de framework
  antes de que la dirección de UI del Studio completo esté decidida, y agrega peso a todo usuario del CLI.
- **Esperar a que exista el Studio completo para embeber el Viewer directamente en él**: rechazado — el
  Studio es `planned`, no existe; el Viewer debe ser usable de forma independiente hoy.
