# ADR 0014 — Foundation metadata and effective level resolution

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 004-foundations. Hay que clasificar cada token foundation como `primitive` o
  `semantic` de forma determinista y sin heurísticas, preservando `base.tokens.json` como única fuente
  de verdad. Resuelve la clarificación de FR-003 (sesión 2026-06-28). Constitución II, III, XIV, XVII.

## Decisión

1. El nivel se declara con metadata DTCG explícita en `$extensions` bajo el namespace
   `ar.neuraz.design-system-manager` → `foundation.level ∈ {primitive, semantic}`. `unclassified` es
   estado **derivado**, no persistible.
2. La metadata puede declararse en un **token** o en un **grupo**; el grupo declara un nivel por rama.
3. **Nivel efectivo** (convención Neuraz, no herencia DTCG estándar): `token propio → grupo ancestro
   más cercano → unclassified`; el token sobrescribe al grupo. Procedencia transportada:
   `{ level, source: token|group|none|invalid, sourcePath, valid }`.
4. El nivel **no** se infiere de nombres, rutas, prefijos, `$type`, condición/target de alias ni de
   registros externos.
5. **Metadata inválida** (namespace/`foundation` no-objeto, `level` no-string, valor no permitido,
   `"unclassified"` persistido) → issue `foundation-level-invalid` **una vez por declaración** (no por
   descendiente), con path lógico, sin stack ni volcado de `$extensions`; nivel derivado
   `unclassified`; categoría `invalid`. Nunca se autocorrige.

## Consecuencias

- Clasificación inequívoca y versionable; sin lock-in (DTCG portable).
- El DS de `init` queda `unclassified` hasta que 005/edición añada metadata (001 intacto).
- Futuras escrituras deben preservar `$extensions` desconocido y modificar solo campos gestionados.

## Alternativas rechazadas

- **Convención de nombres** (`base.*`/`semantic.*`/…): nombres son dominio del usuario; renombrar
  cambiaría el significado; ambigua; difícil de versionar; hostil a preservación.
- **Registro externo** en `design-system.json`: dos fuentes de verdad, desincronización, menor
  portabilidad, contradice persistencia Opción A.

## Referencias

[spec FR-003/FR-037..FR-046](../../specs/004-foundations/spec.md),
[contract foundation-extension-v1](../../specs/004-foundations/contracts/foundation-extension-v1.contract.md),
[foundation-level-resolution-v1](../../specs/004-foundations/contracts/foundation-level-resolution-v1.contract.md).
Relacionado: ADR-0015/0016/0017.
