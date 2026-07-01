<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/010-visual-token-editor/plan.md` (feature 010-visual-token-editor — interfaz visual local para
crear, modificar y organizar tokens usando exclusivamente `008-token-mutations` y reutilizando el shell
del `009-design-system-viewer`).
Features 001-ds-init, 002-ds-validate-inspect, 003-json-output, 004-foundations, 005-presets,
006-build-export, 007-asset-manager, 008-token-mutations y 009-design-system-viewer estan cerradas y se
reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest; UI local heredada de 009 con `node:http` y TypeScript/DOM vanilla, sin nueva dependencia
runtime prevista. Formato canonico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013; 004: 0014–0017; 005: 0018–0021; 006: 0022–0025; 009: 0026; 010: 0027).
<!-- SPECKIT END -->

## Visión de producto

El Core actual (`001`–`009`) es la base de **Neuraz Design System Studio**. Antes de proponer cualquier
capacidad futura (UI, assets, importadores, IA, MCP), lee [`docs/product/`](docs/product/README.md):
[visión](docs/product/vision.md), [guardrails arquitectónicos](docs/product/architecture-guardrails.md)
y [mapa de capacidades](docs/product/capability-map.md). Solo `001`–`009` están `implemented`; `010` esta
especificada como siguiente feature y aun no implementa codigo productivo.
