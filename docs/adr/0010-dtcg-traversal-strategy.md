# ADR 0010 — Estrategia de recorrido del árbol DTCG

- **Estado**: Aceptado
- **Fecha**: 2026-06-26
- **Contexto**: Feature 002-ds-validate-inspect. El análisis común debe recorrer el documento DTCG
  2025.10 una sola vez, de forma segura, determinista y lineal, produciendo tanto validación como
  estadísticas de inspección sin doble recorrido.

## Decisión

### Detección de nodos (DTCG 2025.10)
- **Propiedades reservadas**: `$value`, `$type`, `$description`, `$deprecated`, `$extensions`
  (en grupos también `$extends`). No son hijos.
- **Token**: objeto con `$value`. **Alias**: token cuyo `$value` es referencia `{group.token}`.
- **Grupo**: objeto sin `$value` que organiza hijos. La **raíz NO cuenta como grupo**.
- **Nodo inválido recuperable**: se conserva con su ruta y `trust: untrusted`.

### Orden y recorrido
- Recorrido **iterativo** con stack explícito (sin recursión; ver ADR-0009).
- Orden de visita = **orden de inserción del JSON** (lo preserva `JSON.parse`), para que la inspección
  represente el archivo real. No se reordena lexicalmente en silencio.
- **Ruta canónica**: segmentos unidos por `.`; la raíz es profundidad `0`; cada nivel suma 1.

### Tipo efectivo e índice
- `$type` efectivo — precedencia normativa única (C1, ver ADR-0008): **(1)** declarado en el token →
  **(2)** si no declara y `$value` es referencia, tipo efectivo del token referenciado (resolviendo
  cadenas) → **(3)** si no es referencia, heredado del grupo ancestro más cercano que lo declare →
  **(4)** indeterminable (inválido). El tipo del alias prevalece sobre el del grupo; ciclo o alias roto
  ⇒ `effectiveType: null`.
- Se construye un índice **`tokenPath → token` en una sola pasada**; los aliases se resuelven contra
  el índice (sin recorrer el árbol por cada alias) y se detectan ciclos sobre ese grafo.

### Métricas calculadas en la pasada
total de nodos, grupos, tokens, valores concretos, aliases, `byType` (por tipo **efectivo**; tipos
desconocidos en su literal; sin tipo determinable en `"(untyped)"`), profundidad máxima,
descripciones, destino y estado de alias, confiabilidad y errores asociados.

### Complejidad
Tiempo `O(nodos + aliases)`, memoria proporcional al documento + índice + modelo de salida. Sin
recorridos cuadráticos.

## Consecuencias

- Una única pasada alimenta validación e inspección ⇒ resultados coherentes entre `validate`/`inspect`.
- Determinismo: mismo documento ⇒ mismo resultado y mismo orden.
- Detalle de conteo en [data-model.md](../../specs/002-ds-validate-inspect/data-model.md).

## Alternativas rechazadas

- Recursión natural: riesgo de desbordamiento (ver ADR-0009).
- Reordenar lexicalmente por defecto: la inspección dejaría de reflejar el archivo real.
- Resolver cada alias recorriendo el árbol: complejidad cuadrática evitable con índice.
- Dos recorridos separados (validate/inspect): doble costo y posible divergencia.
