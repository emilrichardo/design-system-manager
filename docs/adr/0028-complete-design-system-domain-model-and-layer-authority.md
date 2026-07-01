# ADR 0028 — Complete Design System domain model and layer authority

- **Estado**: Aceptado
- **Fecha**: 2026-07-01
- **Contexto**: `011-complete-design-system-foundation-branding-and-presets` audited the historical vision
  (constitution, `docs/product/**`, ADR-0001–0027, `specs/001-010/**`) and found that while the
  constitution never scoped the product to tokens-only (Principle IX already anticipates component
  contracts; Principle XI, validation pages; Principle XII, content), the product-level documentation and
  every closed spec (`001`–`010`) only covered the token/asset/viewer/editor Core. No document defined an
  explicit taxonomy for Brand, Component System, Patterns/Templates or Governance as first-class domains,
  nor their authority/dependency direction relative to tokens.

## Decision

1. The product is modeled as five levels — Brand System, Foundations and Tokens, Component System,
   Patterns and Templates, Governance and Distribution — plus one cross-cutting layer, Import/Inference/
   Agent Orchestration. This taxonomy is canonical and lives in
   `docs/product/complete-design-system-model.md`.
2. Authority flows strictly downward: a higher level may reference/inform a lower level; a lower level is
   valid on its own without any higher level existing (e.g. a token-only Design System with no Brand
   System is still valid — see ADR-0029 for the compatibility guarantee).
3. The cross-cutting layer never writes directly to any level's source of truth. It only produces
   `CandidateV1` proposals (evidence, confidence, provenance, review state) that require explicit
   human approval before touching any file — this extends guardrails 7–9 to every level, not only tokens.
4. `001`–`010` are reused as the closed implementation of "Foundations and Tokens" (Core) plus the read
   surface (`009` Viewer) and write surface (`010` Editor) for tokens specifically. They are not
   rewritten; `011` only extends them (deep DTCG types, token layer metadata, new Viewer/Editor
   projections).
5. The pre-existing contradiction between Constitution Principle IV (Style Dictionary as the intended
   pipeline) and the actual `006-build-export` implementation (a custom deterministic pipeline, no Style
   Dictionary dependency) is recorded here and in `research.md` of `011` as a known, documented gap. It is
   **not** resolved by this ADR — resolving it requires an explicit constitutional amendment per the
   Constitution's own Governance section, which was not requested.

## Consequences

- Every future feature (`012`–`021`, see `docs/product/complete-design-system-roadmap.md`) has an
  unambiguous home in the model before it is specified, preventing scope drift from recurring silently.
- `capability-map.md` now carries two orthogonal groupings (technical subsystem and model level) for the
  same underlying capabilities, so neither view has to be discarded to introduce the other.
- Any future proposal that would make a level depend upward (e.g. Foundations requiring Brand System to
  exist) must be justified as an explicit exception, not implemented silently.
- The Style Dictionary contradiction remains an open item until an authorized amendment is made; no
  feature may claim Style Dictionary compliance without one.

## Alternatives Considered

- **Treat Brand/Components/Patterns as "Studio features" without a taxonomy**: rejected — this is exactly
  the drift found in the audit; it would keep the product framed as tokens+UI instead of a complete
  Design System.
- **Rewrite `001`–`010` to fit a new taxonomy from scratch**: rejected — violates Constitution Principle
  XVI (incremental, verifiable change) and would discard closed, tested work for no functional gain.
- **Silently amend Constitution Principle IV to match the real build pipeline**: rejected — the
  Constitution's Governance section requires an explicit, approved amendment proposal; this ADR documents
  the gap instead of unilaterally resolving it.
