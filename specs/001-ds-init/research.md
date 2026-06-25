# Research — ds-init (Phase 0)

Investigación verificada en fuentes oficiales/primarias (consultada 2026-06-25). Cada decisión
sigue el formato Decision / Rationale / Alternatives. Las versiones exactas se fijarán al instalar
(no se añaden dependencias en esta fase).

## 1. Versión de la especificación DTCG

- **Decision**: Adoptar **DTCG — Design Tokens Format Module 2025.10** como formato canónico
  inicial de tokens. Usar `$value`, `$type`, `$description` y reservar `$extensions` para
  metadatos propios; aliases mediante referencias `{group.token}`.
- **Rationale**: 2025.10 es la **primera versión estable** del estándar, anunciada por el W3C
  Community Group el 28-oct-2025; es vendor-neutral y soportada por Figma, Tokens Studio, Style
  Dictionary, Terrazzo, etc. Fijar una versión estable evita inventar formato (Constitución III).
- **Alternatives considered**: Drafts previos (inestables, cambiantes) — rechazados por riesgo de
  ruptura. Formato propietario — prohibido por la Constitución.
- **Fuentes**:
  - https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
  - https://www.designtokens.org/tr/2025.10/format/
- **Nota de validación**: la representación exacta del valor de color en 2025.10 admite forma de
  objeto (`colorSpace`/`components`) y la forma hex de cadena. Para el token mínimo inicial se usa
  hex string por máxima compatibilidad de herramientas; la adopción del objeto de color se decide
  en la fase de validación/generación, no aquí (ver ADR-004 y `dtcg-tokens.contract.md`).

## 2. Style Dictionary (contexto futuro, NO se instala)

- **Decision**: No instalar ni ejecutar Style Dictionary en `init`. Mantener la fuente DTCG
  separada de una futura carpeta de artefactos generados para no condicionar la integración.
- **Rationale**: Style Dictionary **v4** introdujo soporte DTCG de primera clase, pero el soporte
  **completo de 2025.10 está en progreso para v5**. Acoplar ahora arriesgaría decisiones
  incompatibles. `init` solo debe dejar una fuente DTCG válida y una separación fuente/artefactos.
- **Alternatives considered**: Generar salidas ahora — fuera de alcance (spec) y prematuro.
- **Fuente**: https://styledictionary.com/info/dtcg/

## 3. Runtime Node.js

- **Decision**: Objetivo **Node.js `>=22`** (`engines.node: ">=22"`). Desarrollo/CI sobre 22 y 24.
- **Rationale**: En 2026-06 las líneas mantenidas son **24 (Active LTS)** y **22 (Maintenance
  LTS)**; 20 quedó EOL el 30-abr-2026. Apuntar a >=22 cubre las LTS vigentes y evita líneas EOL.
- **Alternatives considered**: `>=20` — rechazado (EOL). `>=24` — innecesariamente restrictivo
  para usuarios aún en 22 (Maintenance hasta abr-2027).
- **Fuentes**: https://nodejs.org/en/about/previous-releases · https://endoflife.date/nodejs

## 4. Lenguaje y formato de módulos

- **Decision**: **TypeScript estricto** compilado a **ESM** (`"type": "module"`,
  `module/moduleResolution: NodeNext`), distribuido como paquete npm con `bin` (`neuraz-ds`).
- **Rationale**: Coincide con el modelo de distribución npm pedido; tipado fuerte para contratos y
  validación; ESM es el estándar actual de Node LTS. Multiplataforma.
- **Alternatives considered**: JS puro (menos seguridad de tipos para contratos); CJS (legado).
  Una alternativa no-Node/TS no se justifica frente al modelo npm.

## 5. Librería de CLI (comandos/argumentos)

- **Decision**: **commander**.
- **Rationale**: Mantenida activamente (v15, 2026), 0 dependencias de producción, tipos TS,
  soporte sólido de subcomandos — útil para los futuros `validate`/`inspect`/`import`/`dev` sin
  reescritura. Evita construir un framework propio.
- **Alternatives considered**: `cac` (excelente y minúsculo; viable, pero menor ecosistema);
  `clipanion` (potente pero orientado a CLIs grandes, más peso conceptual); `yargs` (más pesado).
- **Fuente**: https://www.npmjs.com/package/commander

## 6. Prompts interactivos

- **Decision**: **@clack/prompts**.
- **Rationale**: Mantenida (v1.6, 2026), maneja **cancelación** del usuario de forma nativa (clave
  para `status: "cancelled"` sin estado parcial), salida accesible y consistente. Se aísla tras un
  puerto `Prompter`, por lo que no contiene reglas de negocio.
- **Alternatives considered**: `prompts`/`inquirer` (válidos; @clack tiene mejor manejo de cancel
  y estética); prompts propios (innecesario).
- **Fuente**: https://www.npmjs.com/package/@clack/prompts

## 7. Validación (3 capas)

- **Decision**:
  - **Validación de entrada y de dominio** con **zod** (nombre, slug, versión, forma del manifiesto
    y de la config del gestor) — tipos derivados del schema.
  - **Validación de SemVer** con el paquete **semver** (canónico) para versión.
  - **Validación de archivos generados / documento DTCG** con **ajv** contra un **JSON Schema
    (draft 2020-12)** que modela el subconjunto DTCG soportado.
- **Rationale**: Separar las capas refleja la Constitución VIII y la guía de la tarea (entrada /
  dominio / archivos). zod cubre entrada/dominio con buena DX TS; ajv es el validador JSON Schema
  más estándar y rápido (soporta 2020-12), idóneo para DTCG. semver es la referencia para SemVer.
- **Alternatives considered**: Solo zod para todo (zod no es ideal para validar JSON Schema DTCG
  externo); solo ajv (peor DX para entrada/dominio tipados); regex manual de SemVer (frágil).
- **Fuentes**: https://zod.dev/ · https://ajv.js.org/ · https://www.npmjs.com/package/semver

## 8. Resolución de raíz anfitriona y seguridad de rutas

- **Decision**: Implementar con **APIs nativas de Node** (`node:fs`, `node:path`): ascenso desde
  `process.cwd()` real buscando `package.json`, detección de raíz Git (`.git`) como tope, selección
  del `package.json` más cercano (monorepo), normalización con `path.resolve` + `fs.realpathSync`
  y verificación de contención (`resolved.startsWith(hostRoot + sep)`) para rechazar escapes y
  symlinks externos.
- **Rationale**: Evita dependencias para algo central a la seguridad (Constitución XIV); fácil de
  testear de forma aislada. `realpath` neutraliza symlinks; la verificación de contención impone el
  límite autorizado.
- **Alternatives considered**: `find-up`/`pkg-dir` (añaden deps para lógica trivial y no resuelven
  el tope Git ni el anti-escape por sí solas).

## 9. Testing

- **Decision**: **vitest** (v4). Unitarias para dominio/adaptadores; integración en directorios
  temporales (`fs.mkdtemp` bajo `os.tmpdir()`); CLI por subproceso verificando exit codes y
  archivos resultantes. Verificación **semántica** (parsear y comparar estructura), no solo
  snapshots de texto.
- **Rationale**: vitest es actual (v4, 2025-10), rápido, soporte TS/ESM nativo. Cumple SC-007
  (pruebas automatizadas en directorio temporal).
- **Alternatives considered**: `node:test` (viable, menos ergonómico para mocking/fixtures); jest
  (configuración ESM/TS más pesada).
- **Fuente**: https://vitest.dev/

## 10. Estrategia de escritura segura (transaccional)

- **Decision**: Modelo **stage → validate → confirm → commit → verify**:
  1. Construir todo el contenido **en memoria** y un plan de archivos.
  2. Validar entrada y plan (incluida validez DTCG del contenido a escribir) **antes** de tocar el
     disco.
  3. Detectar conflictos comparando rutas objetivo con el FS real (sin sobrescribir).
  4. Escribir solo tras confirmación, en un **directorio temporal de staging dentro de la raíz
     anfitriona**; luego mover/renombrar atómicamente a las rutas finales.
  5. Ante cualquier fallo, **rollback**: eliminar el staging y no dejar archivos parciales.
  6. **Validación posterior** releyendo los archivos escritos.
  7. Reporte final estructurado.
- **Rationale**: Garantiza atomicidad (FR-022, US5) sin dependencias; el rename dentro del mismo
  filesystem es atómico en POSIX/Windows. Staging dentro de la raíz evita cruzar dispositivos.
- **Alternatives considered**: Escritura directa archivo por archivo (riesgo de estado parcial);
  librerías de escritura atómica (innecesarias para este alcance).

## Decisiones pendientes (a registrar como ADR en esta misma fase)

- ADR-0001 requisito npm · ADR-0002 raíz anfitriona · ADR-0003 identidad (slug/versión) ·
  ADR-0004 estructura mínima de archivos · ADR-0005 stack inicial del CLI. Ver `docs/adr/`.

## Sin NEEDS CLARIFICATION pendientes

Todas las incógnitas del Technical Context quedaron resueltas. Ninguna decisión inventa versiones.
