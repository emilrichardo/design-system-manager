# ADR 0024 — Transactional artifact-set publication

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: `build` debe publicar varios archivos en `design-system/build/`, conservar archivos
  desconocidos, bloquear concurrencia y reportar honestamente los límites de atomicidad del filesystem.

## Decisión

1. Se crea un puerto nuevo `ArtifactSetWriter`; no se reutiliza directamente el writer de archivo único
   de 005.
2. La estrategia v1 es `staged-managed-set-v1`: render completo en memoria, staging sibling, verificación
   de staging, re-chequeo optimista, backup de gestionados, publicación por paths gestionados,
   manifest al final y verificación posterior.
3. El manifest previo soportado es la única autoridad de ownership. Manifest ausente/corrupto/no
   soportado no autoriza sobrescribir archivos existentes en paths requeridos.
4. Archivos desconocidos se preservan siempre; no hay clean global ni delete de desconocidos.
5. Cambios concurrentes de source, manifest, artifacts, parents o symlinks antes de publicar producen
   `conflict`, `wrote:false`.
6. Si la publicación ocurre pero la verificación posterior falla, el resultado es
   `verification-error`, `wrote:true`; se retiene backup y no hay rollback destructivo automático.

## Consecuencias

- La garantía de set completo se basa en precondiciones + staging + verificación, no en prometer una
  atomicidad de directorio que el filesystem no ofrece de forma portable.
- Unknown files quedan protegidos.
- Hay que cubrir fallos de rename, symlink, permisos, manifest corrupto y concurrencia en tests.

## Alternativas rechazadas

- Reemplazo atómico del directorio completo: pierde o mueve desconocidos.
- Directory rename como única operación: no preserva unknown files sin merge.
- Rollback automático tras verification-error: agrega una segunda escritura destructiva.
- Lockfile como única defensa: no detecta ediciones externas no cooperativas.
