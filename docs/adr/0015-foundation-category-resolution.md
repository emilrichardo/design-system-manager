# ADR 0015 — Foundation category resolution and category states

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 004-foundations. El nivel (`primitive|semantic`) se resuelve por metadata
  (ADR-0014), pero la **categoría** foundation (color/spacing/…) necesita una regla determinista. `$type`
  es insuficiente (spacing/radius/sizing→`dimension`). Hay que evitar heurísticas ambiguas y no romper
  la decisión de no persistir categoría (FR-046). Constitución III, XVI.

## Decisión

1. **Resolución de categoría**: `category = primer segmento canónico del path` cuando coincide
   exactamente con un id del registro (`color|spacing|typography|radius|border|shadow|opacity|sizing|
   motion`); en caso contrario `unresolved`. Sin inferencia por `$type`, nombres más allá del id,
   alias o registro de roles. Los `unresolved` se preservan y se exponen aparte; nunca se adivinan.
2. **Registro de categorías** fijo e inmutable (id, displayOrder 0–8, supportedTypes, validationDepth,
   allowsPrimitive/allowsSemantic), **sin valores/escala/preset/CSS**.
3. **Chequeo de tipo informativo**: si `effectiveType ∉ supportedTypes` de la categoría resuelta →
   warning `foundation-type-mismatch` (no fatal); la categoría permanece. Solo `color` es profundo.
4. **Estados de categoría** (precedencia `invalid > partial > complete > absent`): definidos por
   clasificación + validez de relaciones, **nunca** por un roster concreto de tokens (los valores son
   de presets).
5. **`foundation.category` NO se persiste** en `$extensions` (FR-046): existe regla determinista, así
   que la metadata de categoría es innecesaria en v1.

## Consecuencias

- Categoría determinista sin metadata adicional ni heurística.
- Tokens semánticos bajo grupos no canónicos (p. ej. `background.*`) quedan `unresolved` en v1
  (honesto, no destructivo), análogo a `unclassified` para el nivel.
- `complete` queda bien definido sin depender de valores → compatible con presets.

## Alternativas rechazadas

- **Categoría por `$type`**: ambigua (tipos compartidos).
- **Registro interno de roles/nombres**: heurístico, no versionable, frágil ante renombres.
- **Añadir `foundation.category` a `$extensions` ahora**: innecesario (existe regla), y FR-046 lo
  prohíbe salvo imposibilidad demostrada (no es el caso). Queda como posible extensión futura (005).

## Referencias

[contract foundation-category-definition-v1](../../specs/004-foundations/contracts/foundation-category-definition-v1.contract.md),
[foundations-result-v1](../../specs/004-foundations/contracts/foundations-result-v1.contract.md),
[research §4/§6](../../specs/004-foundations/research.md). Relacionado: ADR-0014/0016.
