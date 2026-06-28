# Specification Quality Checklist: 004-foundations

**Purpose**: Validate specification completeness and quality before `/speckit-clarify` or `/speckit-plan`
**Created**: 2026-06-28
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs) — capabilities are behavioural; no code
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain — **1 remains** (FR-003, classification mechanism)
- [X] Requirements are testable and unambiguous (except the single flagged classification rule)
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows (14 stories, prioritized)
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Coverage review

- [X] Story quality & testability
- [X] Category coverage — 9 categories with purpose/primitive/semantic/`$type`/validation-level/status
- [X] Alias rules — primitive/semantic directions, cycles, missing refs, to-group, type-incompat
- [X] DTCG compatibility — category vs `$type` vs group vs level vs role vs name distinguished; no
      false claim of deep validation (only `color` deep)
- [X] Persistence — Option A decided (single tokens file), alternatives rejected with rationale
- [X] Security — reuses `002` guarantees (limits, no symlink escape, no code exec, read-error/partial)
- [X] Determinism — stable category/token/issue order; no timestamps/UUID/env; TTY/locale-independent
- [X] Compatibility with 001/002/003 — init unchanged; validate/inspect unchanged; JSON v1 byte-stable
- [X] foundations / presets separation — `004` = structure/rules; `005` = values
- [X] Out of scope — explicit and broad
- [X] Success criteria — measurable (SC-001..011)
- [X] Clarifications — limited to the single materially-blocking public-contract decision

## Notes

- The remaining `[NEEDS CLARIFICATION]` (FR-003) is the **only** genuinely blocking decision: how a
  token's `primitive | semantic` level is signalled (explicit `$extensions` metadata vs naming
  convention vs fixed role registry). It materially shapes the public contract and the
  "no ambiguous guessing" success criterion (SC-002), and reasonable designers would differ.
  Recommended default: explicit `$extensions` metadata, with unlabeled tokens reported as
  `unclassified` (preserved). Resolve via `/speckit-clarify` before `/speckit-plan`.
- All other decisions (persistence A, dedicated CLI, derived states, single analysis, motion bounded)
  are decided in the spec using the simplest/most-reversible/closed-feature-compatible criteria.
