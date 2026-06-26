# ADR 0009 — Límites seguros de lectura y recorrido

- **Estado**: Aceptado
- **Fecha**: 2026-06-26
- **Contexto**: Feature 002-ds-validate-inspect. `validate`/`inspect` leen y recorren documentos no
  controlados por Neuraz. Se requieren límites deterministas que protejan contra consumo excesivo,
  desbordamiento de pila y entradas patológicas (árboles profundos, JSON enorme, alias largos),
  amplios para DS reales y **no** configurables públicamente en esta feature.

## Decisión

| Límite | Valor | Tipo | Justificación (ver research.md) |
|---|---:|---|---|
| Tamaño máx. por archivo | 5 MiB | duro | Un `*.tokens.json` real rara vez supera cientos de KiB. |
| Tamaño máx. total leído | 16 MiB | duro | Cubre múltiples fuentes con margen amplio. |
| Profundidad máx. del árbol | 32 | duro | DS reales rara vez pasan de ~6–8 niveles. |
| Nº máx. de nodos | 100 000 | duro | Muy por encima de DS grandes; acota memoria/tiempo. |
| Longitud máx. de ruta de token | 512 | duro | Evita rutas degeneradas. |
| Longitud máx. de referencia alias | 256 | duro | Aliases legítimos son cortos. |
| Nº máx. de issues acumulados | 1 000 | duro | Evita informes ilimitados; el resto se resume. |

### Comportamiento al alcanzar un límite
- El tamaño se comprueba con `stat` **antes** de leer (`too-large` ⇒ no se lee el archivo).
- Límite duro alcanzado ⇒ **error** (`limit-*-exceeded`) ⇒ `valid: false`, `limits.partial: true`,
  documento(s) afectados en `uncheckedDocuments`.
- Se **conserva** la información parcial ya analizada (no se descarta), marcada como tal en `inspect`.
- **Nunca** se trunca en silencio: todo recorte produce un `Issue` estructurado.
- Recorrido **iterativo** con stack explícito (sin recursión) para no desbordar la pila a profundidad
  alta; el límite de profundidad actúa antes del de nodos.

No se exponen como configuración pública en 002 (posible feature futura).

## Consecuencias

- Análisis acotado y determinista; sin crash por entradas adversas.
- `validate`/`inspect` informan con precisión qué quedó sin comprobar.

## Alternativas rechazadas

- Sin límites / recursión natural: riesgo de desbordamiento y consumo ilimitado.
- Truncado silencioso al alcanzar límites: oculta cobertura incompleta (viola la spec).
- Límites configurables ya en 002: amplía alcance sin necesidad actual.
