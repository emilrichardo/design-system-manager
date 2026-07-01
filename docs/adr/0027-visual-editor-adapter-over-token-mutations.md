# ADR 0027 — Visual Token Editor as a write-capable adapter over token mutations

- **Estado**: Aceptado
- **Fecha**: 2026-07-01
- **Contexto**: `010-visual-token-editor` is the first write-capable local UI surface after the read-only
  `009-design-system-viewer`. It must let users edit tokens visually without weakening the safety model
  closed in `008-token-mutations` or duplicating the Viewer shell/projections closed in `009`.

## Decision

1. The Visual Token Editor is an adapter over `008` `TokenMutationCommandV1`,
   `planTokenMutation` and `applyTokenMutation`. It does not directly write `base.tokens.json`, build a
   candidate document, validate aliases, calculate diffs or call writer adapters.
2. The Editor lives inside or alongside the `009` local Viewer shell. Viewer projections remain the
   current/read state; Editor state is draft/review/apply/recovery state. The UI must explicitly label the
   boundary: `009 Viewer = lectura y exploracion`; `010 Editor = comandos, plan, diff, aprobacion y apply`.
3. The Editor may introduce write-capable local HTTP adapter routes, but only as loopback-only, offline,
   adapter-thin routes that accept structured commands and call `008`. There is no generic source-patch,
   file path or filesystem write route.
4. The Editor exposes its own `EditorJsonEnvelopeV1`, separate from `ViewerJsonEnvelopeV1`, because read
   projections and write/recovery states have different contracts and must not be conflated.
5. `src/application/editor/**` remains framework-agnostic and infrastructure-free: no DOM/browser globals,
   `node:http`, `node:fs`, Commander or writer ports. UI/server details stay in infrastructure/adapters.

## Consequences

- CLI, future MCP and Studio can share one mutation behavior through `008`, reducing drift across
  interfaces.
- The Editor inherits `008` concurrency, idempotency, recovery and no-force policies instead of inventing
  UI-specific exceptions.
- The Viewer can remain useful as a read-only surface even when the Editor is disabled or no draft exists.
- The local server boundary becomes mutable for the first time, so tests must distinguish read-only Viewer
  routes from write-capable Editor routes and verify loopback/offline containment.
- A future richer Studio can replace the visual shell while preserving command/plan/apply contracts.

## Alternatives Considered

- **Direct browser/file JSON editing**: rejected because it bypasses `008` validation, alias rewriting and
  transactional apply.
- **A UI-specific planner/diff**: rejected because it would duplicate the Core and eventually diverge.
- **A separate editor app**: rejected for v1 because it duplicates `009` navigation/session/projections
  and packaging.
- **Reusing `ViewerJsonEnvelopeV1` for write results**: rejected because Viewer contracts are read-only and
  do not model approval, apply, recovery or `wrote`.
