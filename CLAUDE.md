<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/004-foundations/plan.md` (feature 004-foundations — vista de solo lectura de foundations:
clasificación primitive/semantic por metadata `$extensions`, categorías, estados y validación de
relaciones, derivada del análisis único; comando `neuraz-ds foundations` (+ `--json`); sin reanalizar,
sin escribir, sin tocar 001/002/003 ni el JSON v1).
Features 001-ds-init, 002-ds-validate-inspect y 003-json-output
(`specs/00{1,2,3}-*/plan.md`) están cerradas y se reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest (sin nuevas dependencias en 004). Formato canónico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013; 004: 0014–0017).
<!-- SPECKIT END -->
