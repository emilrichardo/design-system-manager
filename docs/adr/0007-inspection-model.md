# ADR 0007 — Modelo canónico de inspección

- **Estado**: Aceptado
- **Fecha**: 2026-06-26
- **Contexto**: Feature 002-ds-validate-inspect. `inspect` debe describir un Design System existente
  de forma estructurada y reutilizable (CLI hoy; TUI/Studio/MCP futuros) sin presentar datos
  parcialmente incorrectos como confiables. Debe distinguir presencia ≠ validez ≠ inspección.

## Decisión

`DesignSystemInspection` es la vista descriptiva derivada del **análisis común**
(`analyzeExistingDesignSystem`); **incluye** `ValidationReport`, no lo sustituye. Secciones: `host`,
`structuralState`, `identity?`, `schemaVersions?`, `files`, `tokens?`, `validation`, `limits`.

La confiabilidad se marca por **sección/valor** con un único envoltorio mínimo:

```ts
type Trust = "valid" | "recovered" | "untrusted" | "unavailable";
interface InspectedValue<T> { readonly value?: T; readonly trust: Trust; }
```

- Cinco estados de dato distinguibles: **presente / válido / recuperado / no confiable / no disponible**.
- En `partial`/`complete-invalid` se entregan datos recuperados marcados; nunca un dato dudoso como
  confiable.
- Mínimo necesario: no se envuelve cada primitivo si una marca por sección basta (p. ej. estadísticas
  de tokens es confiable en bloque cuando el árbol se recorrió sin límite alcanzado).
- `inspect` **no** infiere componentes/patrones/páginas/estilos, **no** resuelve colores a CSS, **no**
  genera artefactos, **no** escribe.

Forma completa en
[contracts/design-system-inspection.contract.md](../../specs/002-ds-validate-inspect/contracts/design-system-inspection.contract.md)
y [data-model.md](../../specs/002-ds-validate-inspect/data-model.md).

## Consecuencias

- Un consumidor (TUI/JSON futuro) puede confiar en `trust` para decidir qué mostrar y cómo.
- Extensible a más secciones sin romper la forma (campos opcionales).
- Acoplamiento controlado: la inspección reusa el análisis, evitando doble lectura/validación.

## Alternativas rechazadas

- Envolver cada valor primitivo en `InspectedValue`: verboso sin beneficio cuando la sección entera
  comparte confiabilidad.
- `inspect` independiente de `validate`: produciría resultados divergentes (prohibido por la spec).
- Inspección "best-effort" sin marca de confiabilidad: presentaría datos incorrectos como válidos.
