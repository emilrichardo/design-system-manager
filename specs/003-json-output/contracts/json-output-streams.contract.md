# Contract — JSON Output Streams (003)

Política de canales, selección de presentación y exit codes para `--json`.

## Selección de presentación

| Modo | Adapter | Escribe |
|---|---|---|
| sin `--json` | reporter textual existente (sin cambios) | `out` si válido, `err` si no (comportamiento actual) |
| con `--json` | reporter JSON | **un** envelope en `out` (outcomes esperados) |

Exactamente **un** adapter por ejecución. El caso de uso headless se invoca **igual** en ambos modos.
El reporter JSON escribe **una sola vez**, en `completed(result)`.

## Outcomes esperados (`valid|complete-invalid|partial|not-found|read-error`)

```text
stdout → exactamente un documento JSON + "\n"
stderr → vacío
exit   → exitCodeForOutcome(outcome)   (0/3/4/5/6; ADR-0006, sin cambios)
```

- Se produce JSON **aunque el exit sea ≠ 0** (FR-019/FR-020/FR-025).
- stdout: solo JSON; sin ANSI, spinners, símbolos de Clack, tablas ni mensajes de truncado (FR-019).
- No depende de TTY; funciona con stdout redirigido (SC-008).

## Error interno (CLI)

```text
stdout → vacío
stderr → exactamente un envelope JSON de error interno + "\n"
exit   → 70
```

Ver [json-internal-error-v1](json-internal-error-v1.contract.md).

## Error de uso de Commander

Política existente sin cambios: mensaje del parser por `err`, **exit 3** (`USAGE_ERROR_EXIT`). No se
convierte a JSON en v1 (FR-035). `--json` solo surte efecto tras aceptarse los argumentos.

## Flag

`--json` booleano **local** (`default false`) en `validate` e `inspect`. **No** en `init`. **No**
global (evita `neuraz-ds --json init`).

## Exit codes (tabla común; ADR-0006 — no se crea otra)

| outcome | exit |
|---|---|
| valid | 0 |
| complete-invalid | 3 |
| partial | 4 |
| not-found | 5 |
| read-error | 6 |
| internal-error (CLI) | 70 |

`--json` **nunca** altera el código; no usa `1`/`2`/`7` en el flujo de validate/inspect.

## Compatibilidad humana

Sin `--json`: textos, secciones, separación de streams, cota textual de 200, ayuda, ausencia de
prompts y comportamiento sin TTY **idénticos** a pre-003 (FR-028/FR-029). Regresión: 589/589 verdes.
