# ADR 0020 — Atomic preset application and verification

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 005-presets escribe explícitamente `design-system/tokens/base.tokens.json`.
  Debe preservar contenido ajeno, bloquear conflictos, evitar escrituras parciales y verificar el
  resultado después de escribir.

## Decisión

1. No se reutiliza directamente `commitTransaction` de `init`; ese writer crea tres archivos
   inicialmente ausentes. 005 crea un writer específico para reemplazo seguro de un archivo existente.
2. Flujo:

   ```text
   validar preset
   → analizar host
   → planificar
   → construir documento nuevo en memoria
   → re-chequear path/symlink/concurrencia
   → escribir temporal en el mismo directorio
   → verificar temporal
   → rename atómico donde el filesystem lo permita
   → analizar/verificar resultado
   ```

3. La protección de concurrencia es optimista: comparar bytes/hash/stat seguro del original
   inmediatamente antes del reemplazo. Cambio concurrente ⇒ conflicto `preset-concurrent-modification`
   y `wrote:false`.
4. Si el write falla antes de reemplazar, outcome `write-error`, original preservado y temporales
   limpiados.
5. Si el rename tuvo éxito pero post-write verification falla, outcome `verification-error`,
   `wrote:true`; no se intenta rollback automático.

## Consecuencias

- El usuario obtiene una respuesta honesta sobre qué quedó en disco.
- VCS sigue siendo el mecanismo de recuperación ante verification failure.
- Las pruebas deben cubrir permisos, symlinks, temporales, rename failure, concurrencia, reapply y
  verificación posterior.

## Alternativas rechazadas

- `writeFile` directo: riesgo de archivo parcial.
- Rollback automático después de verification failure: segunda escritura potencialmente destructiva.
- Locks complejos: no necesarios para CLI local v1.
