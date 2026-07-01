# ADR 0029 — Brand System storage, DTCG boundary, and brand token policy

- **Estado**: Aceptado
- **Fecha**: 2026-07-01
- **Contexto**: `011` needs to model Brand System (identity, voice & tone, visual language, usage rules,
  evidence) as a first-class domain (see ADR-0028) without a database, without polluting the DTCG tokens
  document, and without ambiguity about whether "brand" is a fourth token-document type or something
  else. It also needs an explicit policy for how brand-derived tokens relate to `primitive`/`semantic`/
  `component` so components never couple directly to marketing decisions.

## Decision

1. **Storage**: Brand System narrative and structured data live under `design-system/brand/**`
   (`brand.json`, `voice-and-tone.json`, `visual-language.json`, `usage-guidelines.json`) — separate
   files from `design-system/tokens/base.tokens.json` and `design-system/assets/**`, using the same
   transactional writer pattern (staging, verification, backup, recovery) already proven by
   `008-token-mutations` and `007-asset-manager`. This extends guardrail 6 ("assets separated from DTCG
   tokens") to brand narrative: brand documentation is not a token document either.
2. **Brand as a token layer**: `brand` is modeled as a **role** on top of `primitive` tokens
   (`$extensions["ar.neuraz.design-system"].brandRole = "brand"`), never as a fourth DTCG document or a
   fourth structural layer. A brand token is structurally a primitive (concrete value, no dependency on
   another token) that additionally carries "this is a brand decision". The preferred reference hierarchy
   is `primitive/brand → semantic → component`.
3. **Asset references are validated, never copied**: `BrandAssetReferenceV1.logicalPath` must resolve
   against the real `007-asset-manager` inventory (`assets.json`); Brand System never stores its own copy
   of asset bytes/metadata.
4. **Brand token bypass policy**: a `component` token that aliases a `brand`-rolled `primitive` directly
   (skipping `semantic`) is flagged with warning `brand-token-bypasses-semantic` (general case:
   `component-token-bypasses-semantic`). This is a **warning, not a hard error** in `011`'s contract, to
   avoid retroactively invalidating any `001`–`010` Design System; promoting it to a hard error requires a
   future ADR once component tokens are actually implemented (`012`).
5. **Provenance vocabulary is shared**: `official | observed | inferred | generated | placeholder |
   user-confirmed` is used identically for `BrandEvidenceV1` and for token/candidate provenance — one
   vocabulary across the whole product, not one per domain.

## Consequences

- Brand System can be read/written/versioned with Git exactly like tokens and assets, with no new
  infrastructure pattern to design from scratch (reuses the transactional writer shape).
- No second alias-resolution engine is needed for brand: it is narrative, not a graph of references.
- Components remain free to change without brand approval as long as they reference `semantic`, not
  `brand`, tokens — preserving the single point of change guardrail already implicit in `004-foundations`.
- A Design System with no `design-system/brand/` directory remains fully valid; Brand System reports
  `absent`, never `invalid` (see FR-017/SC-003 of `011`'s spec.md) — this is the explicit backward
  compatibility guarantee for `001`–`010`.
- Editing brand narrative must go through its own plan/diff/approval/apply use case (mirroring `008`'s
  shape) rather than being forced through `TokenMutationCommandV1`, which is typed for DTCG tokens only.

## Alternatives Considered

- **A fourth DTCG document (`brand.tokens.json`)**: rejected — `002`–`008` assume exactly one tokens
  document; a second document would duplicate the alias-resolution engine and break the "one read/
  analysis pass per execution" invariant (`vision.md` §3).
- **Brand data inside `$extensions` of `base.tokens.json`**: rejected — mixes long narrative/Markdown
  content into a strictly-typed DTCG document, violating the same separation principle as assets.
- **A database for brand metadata**: rejected explicitly by Constitution Principle II.
- **Hard-blocking `brand-token-bypasses-semantic` immediately**: rejected for `011` — would risk breaking
  `001`–`010` Design Systems retroactively before component tokens even exist as a real feature.
