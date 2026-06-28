<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/005-presets/plan.md` (feature 005-presets — catálogo de presets empaquetados,
preview/plan determinista, safe merge y aplicación atómica sobre `design-system/tokens/base.tokens.json`).
Features 001-ds-init, 002-ds-validate-inspect, 003-json-output y 004-foundations están cerradas y se
reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest (sin nuevas dependencias previstas en 005). Formato canónico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013; 004: 0014–0017; 005: 0018–0021).
<!-- SPECKIT END -->
