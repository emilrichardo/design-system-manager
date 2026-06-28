# ADR 0017 — Dedicated foundations command and presentation contract

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 004-foundations necesita una superficie CLI de solo lectura sin romper los
  contratos congelados de `validate`/`inspect` ni el JSON v1 de 003. Constitución V, VI, XIV, XV, XVII.

## Decisión

1. **Comando dedicado** `neuraz-ds foundations` (un único comando de solo lectura; sin subcomandos —
   una sola vista cubre las 14 historias). No se integra en `validate`/`inspect` (presionaría JSON v1).
2. **`--json` en alcance**, opción booleana **local** (default false), sirviendo US5/US12/US13 y el
   principio de integración con agentes, a coste casi nulo reutilizando la serialización determinista.
3. **Contrato JSON separado** `FoundationsJsonEnvelopeV1` con `FOUNDATIONS_JSON_FORMAT_VERSION =
   "1.0.0"` **independiente** del de 003. Reutiliza solo el formateo de bajo nivel
   (`JSON.stringify(env, null, 2) + "\n"`); **no** modifica `JsonEnvelopeV1`, `JSON_FORMAT_VERSION` ni
   los payloads de `validate`/`inspect` (byte-estables; cubierto por regresión). Compartir la cadena
   "1.0.0" no implica compartir contrato.
4. **Exit codes**: reutiliza `exitCodeForOutcome` (0/3/4/5/6) + 70 interno; `--json` no altera el
   código. Streams: outcomes esperados → stdout 1 JSON / stderr vacío; error interno → stderr 1 JSON /
   stdout vacío / exit 70; errores de uso Commander → política existente (exit 3).
5. **Reporter humano** determinista (resumen, 9 categorías en orden canónico con estado y conteos,
   `unresolved`, issues, límites); funciona sin TTY; sin prompts; sin colores obligatorios; sin TUI.
   Puede aplicar una cota visual de tokens (como inspect 200), pero el modelo headless y el JSON
   conservan **todos** los tokens.

## Consecuencias

- 003 byte-estable; foundations es aditivo y aislado.
- Patrón idéntico a 002/003 (un adapter por modo, escritura única en `completed`).

## Alternativas rechazadas

- **Subcomandos** (`foundations inspect/validate/list`): superficie prematura; una vista basta.
- **Integrar en validate/inspect**: alteraría comportamiento y forzaría versionado de JSON v1.
- **Extender `JsonEnvelopeV1` de 003**: acopla y arriesga la estabilidad de bytes.

## Referencias

[foundations-command-v1](../../specs/004-foundations/contracts/foundations-command-v1.contract.md),
[foundations-json-result-v1](../../specs/004-foundations/contracts/foundations-json-result-v1.contract.md).
Relacionado: ADR-0006 (exit codes), ADR-0011/0012/0013 (JSON 003), ADR-0016.
