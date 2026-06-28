# ADR 0019 — Deterministic safe-merge planning

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 005-presets necesita preview determinista y safe merge/add-only. La spec
  incluye `update` en el vocabulario, pero prohíbe overwrites, delete y `--force`.

## Decisión

1. La planificación produce un `TokenChangeSet` genérico y un `PresetApplicationPlan` específico.
   El modelo genérico no contiene `presetId` ni `presetName`, para que importadores futuros puedan
   reutilizarlo.
2. Operaciones v1:
   - `create`: path ausente y agregable.
   - `update`: **solo** agrega `$description` faltante en un token existente ya equivalente.
   - `unchanged`: token equivalente; no write.
   - `conflict`: diferencia bloqueante.
   - `skip`: regla explícita de no aplicación.
3. Diferencias en `$value`, `$type`, alias o foundation level son conflictos bloqueantes. `delete`
   queda fuera de alcance.
4. Equivalencia = igualdad estructural de campos gestionados tras parse JSON; propiedad order y
   spelling numérico no importan. Unknown fields/extensions se ignoran para comparar y se preservan.
5. Orden: categorías 004, luego orden de inserción del preset; conflictos asociados siguen el orden
   del cambio.

## Consecuencias

- `update` no queda ambiguo ni destructivo.
- Reapply puede retornar `unchanged` sin escrituras.
- El motor de aplicación puede aceptar cambios de fuentes futuras siempre que emitan
  `TokenChangeSet`.

## Alternativas rechazadas

- Eliminar `update`: contradice FR-014.
- Usar `update` para reemplazar valores: viola safe merge.
- Agregar metadata foundation faltante a tokens existentes: puede cambiar niveles efectivos.
- Byte equality estricta: produce falsos conflictos por orden/serialización.
