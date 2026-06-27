# ADR 0013 — Streams JSON y errores internos

- **Estado**: Aceptado
- **Fecha**: 2026-06-27
- **Contexto**: Feature 003-json-output. Hay que fijar la política de canales (stdout/stderr) para los
  outcomes esperados y para el error interno (`exit 70`) cuando `--json` está activo, sin romper la
  tabla común de exit codes (ADR-0006) ni la política de errores de uso de Commander. Constitución
  XIV, XVI.

## Decisión

### Outcomes esperados (`valid|complete-invalid|partial|not-found|read-error`)

- **stdout**: exactamente un documento JSON + `"\n"`. **stderr**: vacío. Incluso con exit ≠ 0.
- exit = `exitCodeForOutcome(outcome)` (0/3/4/5/6) — **sin cambios**; `--json` no altera el código.

### Error interno (excepción inesperada, solo CLI)

- No es un outcome de dominio: ocurre cuando el analyzer lanza y la excepción se propaga más allá del
  caso de uso → `completed()` **nunca** se alcanza → **stdout vacío**.
- El **handler del comando** (capa CLI), en modo JSON, envuelve la ejecución; ante excepción
  inesperada emite el envelope `internal-error` (`{code:"internal-cli-error", message seguro}`) en
  **stderr** (una sola escritura) y devuelve **exit 70**. El `catch` del entrypoint permanece como red
  de seguridad **no-JSON** de último recurso.
- `message` seguro: sin stack, sin paths, sin texto crudo no controlado.

### Errores de uso de Commander

- Política existente **sin cambios**: mensaje del parser por stderr, **exit 3** (`USAGE_ERROR_EXIT`).
  **No** se convierten a JSON en v1. `--json` solo surte efecto tras aceptarse los argumentos.

## Consecuencias

- Un consumidor puede `JSON.parse(stdout)` siempre en outcomes esperados, y distinguir el fallo
  interno (stderr + exit 70) de un DS inválido (stdout + exit 3/4).
- stderr permanece vacío en el flujo normal → no rompe pipes que solo leen stdout.

## Alternativas rechazadas

- Emitir el error interno en stdout: rompería `JSON.parse(stdout)` de consumidores y mezclaría flujos.
- Convertir errores de uso de Commander a JSON: amplía el alcance y rediseña el parser (fuera de 003).
- Producir el internal-error desde el reporter: el reporter no se alcanza ante excepción; además no
  conoce de forma garantizada el `command` en ese punto.

## Referencias

- [contracts/json-output-streams](../../specs/003-json-output/contracts/json-output-streams.contract.md),
  [contracts/json-internal-error-v1](../../specs/003-json-output/contracts/json-internal-error-v1.contract.md).
  Relacionado: ADR-0006 (exit codes), ADR-0011, ADR-0012.
