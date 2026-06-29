# ADR 0025 — Build/export outcomes and stream contracts

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: 006 agrega `neuraz-ds build`, `neuraz-ds build --json` y
  `neuraz-ds export <format>` sin modificar exits ni JSON históricos.

## Decisión

1. Outcomes de build: `built`, `unchanged`, `invalid-design-system`, `unsupported-value`, `conflict`,
   `not-found`, `read-error`, `write-error`, `verification-error`.
2. Outcomes de export: `exported`, `invalid-design-system`, `unsupported-value`, `not-found`,
   `read-error`.
3. `internal-error` existe solo en CLI/reporting.
4. Exit codes:
   - `built`/`exported` -> 0
   - `unchanged` -> 2
   - `invalid-design-system` -> 3
   - `unsupported-value`/`conflict` -> 4
   - `not-found` -> 5
   - `read-error`/`write-error` -> 6
   - `verification-error` -> 7
   - `internal-error` -> 70
5. `build` humano escribe reporte a stdout y stderr vacío para outcomes esperados.
6. `build --json` escribe exactamente un `BuildJsonEnvelopeV1` a stdout y stderr vacío para outcomes
   esperados.
7. `export <format>` success escribe bytes exactos del artefacto a stdout y stderr vacío. Errores
   esperados escriben reporte seguro a stderr y stdout vacío.
8. `export` no tiene `--json`; `export json` emite el artefacto JSON.

## Consecuencias

- Shell pipelines pueden consumir artifacts sin ruido.
- CI puede distinguir outcomes por discriminante aunque algunos compartan exit.
- 003/004/005 JSON y exits permanecen intactos.

## Alternativas rechazadas

- JSON envelope para export: colisiona con `export json`.
- Logs alrededor de stdout: rompe pipes.
- Nuevos exit codes para `unsupported-value`: innecesario y menos compatible con la tabla común.
