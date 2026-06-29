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
9. Conflicts de build usan subtipos estables para concurrencia/ownership: `source-modified`,
   `unsupported-unknown-node`, `required-path-owned-by-unknown`, `untrusted-build-manifest`,
   `managed-artifact-modified`, `managed-artifact-missing`.
10. `write-error` puede ser recuperable con metadata: `wrote:false`, `outputAvailable`,
    `backupRelativePath` y `recoveryRequired`. Si falla restore luego de mover el build previo,
    `outputAvailable:false` y `recoveryRequired:true`.
11. `verification-error` ocurre después del commit point: `wrote:true`, `outputAvailable:true`,
    backup relativo retenido y `recoveryRequired:true`.

## Consecuencias

- Shell pipelines pueden consumir artifacts sin ruido.
- CI puede distinguir outcomes por discriminante aunque algunos compartan exit.
- Agentes y usuarios pueden distinguir "no se escribió", "se publicó pero falló verificación" y
  "output temporalmente no disponible pero hay backup".
- 003/004/005 JSON y exits permanecen intactos.

## Alternativas rechazadas

- JSON envelope para export: colisiona con `export json`.
- Logs alrededor de stdout: rompe pipes.
- Nuevos exit codes para `unsupported-value`: innecesario y menos compatible con la tabla común.
- Ocultar recuperación en mensajes humanos solamente: los consumidores headless necesitan campos
  estructurados (`outputAvailable`, `backupRelativePath`, `recoveryRequired`).
