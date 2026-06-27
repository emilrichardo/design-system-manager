<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/003-json-output/plan.md` (feature 003-json-output — salida JSON pública y versionada para
`neuraz-ds validate --json` / `inspect --json`; reutiliza los resultados headless existentes, solo
lectura, sin reanalizar).
Features 001-ds-init (`specs/001-ds-init/plan.md`) y 002-ds-validate-inspect
(`specs/002-ds-validate-inspect/plan.md`) están cerradas y se reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest (sin nuevas dependencias en 003). Formato canónico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013).
<!-- SPECKIT END -->
