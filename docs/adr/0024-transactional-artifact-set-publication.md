# ADR 0024 — Transactional artifact-set publication

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: `build` debe publicar varios archivos en `design-system/build/`, conservar archivos
  desconocidos, bloquear concurrencia y reportar honestamente los límites de atomicidad del filesystem.

## Decisión

1. Se crea un puerto nuevo `ArtifactSetWriter`; no se reutiliza directamente el writer de archivo único
   de 005.
2. La estrategia v1 es `candidate-directory-set-v1`: render completo en memoria, staging sibling que
   contiene el futuro `design-system/build/` completo, copia segura de unknown regular
   files/directories, escritura de artefactos gestionados y build manifest, verificación de staging,
   re-chequeo optimista, backup completo del build previo, rename de staging a `build/` y verificación
   posterior.
3. No hay publicación artifact-by-artifact al `build/` vivo. La garantía es "no mixed managed artifact
   set", no atomicidad absoluta en todos los filesystems.
4. El build manifest previo soportado es la única autoridad de ownership. Build manifest ausente,
   corrupto o no soportado no autoriza sobrescribir archivos existentes en paths requeridos.
5. Archivos desconocidos se preservan solo si son regular files/directories contenidos y dentro de
   límites; symlinks, sockets, FIFOs, devices, special nodes, escapes o exceso de límites producen
   `conflict` / `unsupported-unknown-node`.
6. Cambios concurrentes de source, build manifest, artifacts, parents o symlinks antes de publicar
   producen `conflict`, `wrote:false`. El source se revalida con una lectura byte-only y SHA-256 contra
   el `sourceHash` inicial.
7. Commit point: rename exitoso de staging a `build/`. Desde ese punto `wrote:true`.
8. Si falla antes de mover `build/`, el resultado es `write-error` o `conflict`, `wrote:false` y el
   build previo queda intacto.
9. Si falla después de mover `build/` a backup y antes de publicar staging, se intenta restore
   inmediato. Restore exitoso: `write-error`, `wrote:false`. Restore fallido: `write-error`,
   `wrote:false`, `outputAvailable:false`, backup relativo retenido, `recoveryRequired:true`.
10. Si la publicación ocurre pero la verificación posterior falla, el resultado es
   `verification-error`, `wrote:true`, `outputAvailable:true`, backup retenido,
   `recoveryRequired:true`; no hay rollback destructivo automático.

## Consecuencias

- La garantía de set completo se basa en precondiciones + staging + backup + verificación, no en
  prometer una atomicidad de directorio que el filesystem no ofrece de forma portable.
- POSIX requiere dos renames para el directorio y puede tener ventana de disponibilidad; Windows puede
  bloquear renames por handles/antivirus y requiere retry acotado.
- Unknown files quedan protegidos.
- Hay que cubrir fallos de rename, symlink, permisos, build manifest corrupto, source-modified,
  restore fallido y concurrencia en tests.

## Alternativas rechazadas

- Reemplazo atómico del directorio completo sin staging/copia segura: pierde o mueve desconocidos.
- Publicación por archivo gestionado: puede exponer mixed managed artifact set.
- Rollback automático tras verification-error: agrega una segunda escritura destructiva.
- Lockfile como única defensa: no detecta ediciones externas no cooperativas.
