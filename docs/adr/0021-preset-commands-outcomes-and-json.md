# ADR 0021 — Preset commands, outcomes and JSON contracts

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 005-presets necesita list/inspect/preview/apply, funcionamiento sin TTY y
  JSON propio, sin modificar los contratos de `validate`/`inspect` (003) ni `foundations` (004).

## Decisión

1. CLI:

   ```bash
   neuraz-ds presets list [--json]
   neuraz-ds presets inspect <id> [--json]
   neuraz-ds presets plan <id> [--json]
   neuraz-ds presets apply <id> [--json]
   ```

2. `plan` es la preview explícita y read-only; `apply` es la escritura explícita. No hay prompts,
   `--force`, `--category` ni `--dry-run` en v1.
3. Outcomes y exits:
   - `success`/`applied` → 0
   - `unchanged` → 2
   - `invalid-preset` → 3
   - `conflict` → 4
   - `not-found` → 5
   - `read-error`/`write-error` → 6
   - `verification-error` → 7
   - `internal-error` → 70
4. Presets define `PresetsJsonEnvelopeV1` y `PRESETS_JSON_FORMAT_VERSION = "1.0.0"` independientes.
   Serialización: `JSON.stringify(envelope, null, 2) + "\n"`.
5. Expected outcomes en JSON escriben un envelope en stdout y stderr vacío. Internal error CLI
   escribe envelope seguro en stderr, stdout vacío, exit 70. Errores de uso Commander mantienen exit 3.

## Consecuencias

- 003/004 siguen byte-estables.
- Scripts/CI pueden distinguir preview bloqueada, unchanged, errores de escritura y verification.
- `partial` no se sobrecarga como outcome de presets.

## Alternativas rechazadas

- `neuraz-ds preset ...`: menos claro para un catálogo.
- `apply --dry-run`: mezcla preview con verbo de escritura.
- Extender `JsonEnvelopeV1` o `FoundationsJsonEnvelopeV1`: acopla contratos cerrados.
