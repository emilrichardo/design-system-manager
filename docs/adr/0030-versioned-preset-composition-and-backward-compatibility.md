# ADR 0030 — Versioned preset composition (`web-complete` + packs) and backward compatibility

- **Estado**: Aceptado
- **Fecha**: 2026-07-01
- **Contexto**: `005-presets` already closed a safe, add-only, atomic preset engine with exactly one
  bundled preset (`neutral-base`, 2 categories). `011` needs a second, much larger preset
  (`web-complete`, full foundations + semantic roles + a minimum component-token vocabulary + brand
  placeholders) plus optional "packs" (`commerce`, `dashboard`, `institutional`) layered on top — without
  forking the merge/diff/write engine, and without breaking `neutral-base` or any Design System that
  never adopts `web-complete`.

## Decision

1. **`web-complete` is a second bundled, versioned, immutable preset**, sibling to `neutral-base`, using
   the exact same add-only merge engine and atomic writer already closed in `005-presets`. No new preset
   engine is written.
2. **`neutral-base` is preserved unchanged** as the minimal, compatible preset. `web-complete` does not
   deprecate or replace it.
3. **Packs are a new preset sub-kind (`PresetPackV1`) that can only apply on top of `web-complete`**
   (`basePresetId: "web-complete"`), never on top of `neutral-base` or an arbitrary Design System, to
   avoid ambiguous intermediate states. Packs reuse the identical add-only/atomic/idempotent semantics.
4. **No cartesian combinatorics**: neither `web-complete` nor any pack auto-generates the cartesian
   product of variants × states × sizes for a component. Every token in the bundled catalog must be
   explicitly enumerated by the catalog author — this is a hard rule (R1 of
   `contracts/preset-web-complete.md`), not a style preference.
5. **Quality gate as an explicit, testable contract**: applying `web-complete` to an empty Design System
   MUST produce zero `unclassified`/`unresolved-alias`/`broken-alias`/`unknown-type`/
   `dtcg-type-not-deeply-inspected` issues (SC-001 of `011`'s spec.md). Brand placeholders count as an
   explicit `placeholder` state, never as an issue.
6. **Backward compatibility is a first-class, tested requirement**, not an assumption: any `001`–`010`
   Design System without `brand/` and without token-layer metadata must validate/inspect/build/view
   identically before and after `011`'s eventual implementation (checkpoint F, T028 of `011`'s
   `tasks.md`).

## Consequences

- Adding a third or fourth preset/pack in the future (`012`+) does not require touching the merge engine
  again — only the bundled catalog changes.
- `dashboard`/`institutional` packs are explicitly left "reserved, no catalog yet" rather than inventing
  content to fill the brief's example list — avoiding a false sense of completeness.
- Every preset/pack application remains atomic and idempotent (apply twice → `unchanged`), inherited for
  free from `005`.
- Backward compatibility becomes a concrete, automated regression test (not a one-time manual check),
  which protects `001`–`010` users from silent behavior changes introduced by `011`+.

## Alternatives Considered

- **A generic "preset composition" DSL allowing arbitrary preset chaining**: rejected — over-engineered
  for the two concrete needs (`web-complete` as a base, packs on top of it); `005`'s existing single-base
  add-only merge is sufficient and already trusted.
- **Auto-deriving all variant×state×size combinations from a component's declared axes**: rejected per
  the brief's explicit instruction ("no generar combinaciones cartesianas inútiles") and because most
  components do not need every combination (e.g. `spinner` has no `variant` axis at all).
- **Allowing packs to apply directly on `neutral-base` or a bare Design System**: rejected — would create
  ambiguous partial states (e.g. commerce component tokens referencing semantic roles that only exist in
  `web-complete`).
