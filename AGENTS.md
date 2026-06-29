<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/006-build-export/plan.md` (feature 006-build-export — build/export determinista de artefactos
derivados desde `design-system/tokens/base.tokens.json`: CSS, JSON resuelto, TypeScript y manifest).
Features 001-ds-init, 002-ds-validate-inspect, 003-json-output, 004-foundations y 005-presets están
cerradas y se reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest (sin nuevas dependencias previstas en 006). Formato canónico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013; 004: 0014–0017; 005: 0018–0021; 006: 0022–0025).
<!-- SPECKIT END -->
