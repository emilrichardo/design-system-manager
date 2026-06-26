# ADR 0008 — Política de errores/advertencias y de `$type` DTCG

- **Estado**: Aceptado
- **Fecha**: 2026-06-26
- **Contexto**: Feature 002-ds-validate-inspect. Se necesita una política estable sobre qué invalida
  un Design System (error) y qué solo informa (warning), y específicamente cómo tratar los `$type`
  DTCG 2025.10 cuando Neuraz aún no inspecciona profundamente todos los tipos. Decisión de producto
  aprobada en `/speckit-clarify` de 002.

## Decisión

### Severidades
- **error**: impide `valid: true`.
- **warning**: no invalida, pero informa. Códigos **estables** (nunca texto de AJV/Zod como
  identificador).

### Política de `$type` (DTCG 2025.10)
1. **Reconocido y profundamente soportado** (hoy: `color`): validación estructural + semántica,
   estadísticas, valor/alias inspeccionado.
2. **Reconocido por DTCG 2025.10 pero no profundamente soportado** (los otros 12 tipos estándar):
   **warning** `dtcg-type-not-deeply-inspected`; no invalida; cuenta en `byType`; conserva ruta;
   análisis estructural genérico seguro; **no** transforma `$value`.
3. **No reconocido por DTCG 2025.10**: **error** `dtcg-type-unrecognized`; invalida; nodo conservado
   como `untrusted`; sin interpretación de `$value`.

### `$type` efectivo — precedencia normativa única (C1)

Orden canónico, idéntico en spec (FR-018), research, data-model, contratos y ADR-0010:

1. **`$type` declarado** directamente en el token.
2. Si el token **no** declara `$type` y su `$value` es una **referencia** (`{...}`): usar el
   **tipo efectivo resuelto del token referenciado** (resolviendo cadenas de aliases).
3. Si el token no declara `$type` y su `$value` **no** es una referencia: **heredar** el `$type`
   del **grupo ancestro más cercano** que lo declare.
4. Si ninguna regla determina un tipo: el token es **inválido** (`dtcg-type-undeterminable`).

Consecuencias:
- El tipo del **alias prevalece** sobre el tipo heredable del grupo cuando el alias no declara `$type`.
- Una **cadena de aliases** debe resolver el tipo final del destino último.
- Un **ciclo** impide resolver el tipo (`effectiveType: null`, `dtcg-type-undeterminable`).
- Un **alias roto** no tiene tipo efectivo confiable (`effectiveType: null`).
- Un `$type` **declarado explícitamente** siempre tiene prioridad (paso 1).
- **No** se infiere el tipo desde la forma de `$value`.
- **`$extensions` no participa** en la determinación del tipo.

Se informa **tipo declarado** (`declaredType`), **tipo efectivo** (`effectiveType`) y **origen**
(`typeOrigin: own | alias | group | none`; cuando es `group`, la ruta del grupo fuente va en
`typeSourcePath`).

### Otros warnings aprobados
`dtcg-description-missing` (descripción recomendada ausente), `dtcg-empty-group` (grupo sin tokens),
análisis parcial recuperable cuando corresponda.

### Aliases (errores)
`alias-missing`, `alias-to-group`, `alias-cyclic` (directo/indirecto), `alias-malformed`.

## Consecuencias

- El DS no se invalida por usar tipos DTCG estándar todavía no profundizados por Neuraz, pero el
  usuario queda advertido.
- Tipos verdaderamente fuera de norma sí invalidan, evitando aceptación silenciosa.
- Catálogo de códigos en
  [contracts/validation-report.contract.md](../../specs/002-ds-validate-inspect/contracts/validation-report.contract.md).

## Alternativas rechazadas

- Invalidar cualquier tipo no profundizado: penaliza DS DTCG-válidos legítimos.
- Aceptar silenciosamente tipos desconocidos: viola la spec (nunca válido en silencio).
- Reusar mensajes de AJV/Zod como código: identificadores inestables entre versiones.
