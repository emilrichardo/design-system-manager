// T019 — Contención de rutas dentro de la raíz anfitriona (FR-001h, FR-025, ADR-0002).
// No confía en prefijos de string: resuelve por ruta real el ancestro existente más cercano,
// reconstruye la ruta final y comprueba contención con `path.relative`.
import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

export type ContainmentReason = "escape" | "external-symlink" | "broken-symlink" | "unresolvable-root";

export type Containment =
  | { readonly ok: true; readonly realPath: string }
  | { readonly ok: false; readonly reason: ContainmentReason; readonly message: string };

function reject(reason: ContainmentReason, message: string): Containment {
  return { ok: false, reason, message };
}

/**
 * Comprueba que `candidate` (que puede no existir aún) quede dentro de `rootDir`.
 * Rechaza `..`, rutas absolutas externas, otros workspaces y symlinks que escapen del límite.
 * No crea ni escribe nada.
 */
export function assertWithinRoot(rootDir: string, candidate: string): Containment {
  let rootReal: string;
  try {
    rootReal = realpathSync(rootDir);
  } catch {
    return reject("unresolvable-root", `Raíz anfitriona no resoluble: ${rootDir}`);
  }

  const abs = isAbsolute(candidate) ? resolve(candidate) : resolve(rootReal, candidate);

  // Encontrar el ancestro existente más cercano y resolver su ruta real.
  let existing = abs;
  const restParts: string[] = [];
  let viaSymlink = false;
  let resolvedExisting: string;

  for (;;) {
    try {
      const st = lstatSync(existing);
      if (st.isSymbolicLink()) {
        viaSymlink = true;
        try {
          resolvedExisting = realpathSync(existing);
        } catch {
          return reject("broken-symlink", `Enlace simbólico roto: ${existing}`);
        }
      } else {
        const real = realpathSync(existing);
        if (real !== existing) viaSymlink = true;
        resolvedExisting = real;
      }
      break;
    } catch {
      const parent = dirname(existing);
      if (parent === existing) {
        return reject("escape", `No se halló un ancestro existente para: ${candidate}`);
      }
      restParts.unshift(basename(existing));
      existing = parent;
    }
  }

  const finalReal = restParts.length > 0 ? resolve(resolvedExisting, ...restParts) : resolvedExisting;
  const rel = relative(rootReal, finalReal);
  const escapes = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);

  if (escapes) {
    return viaSymlink
      ? reject("external-symlink", `La ruta atraviesa un enlace simbólico fuera del límite: ${candidate}`)
      : reject("escape", `La ruta escapa de la raíz anfitriona: ${candidate}`);
  }
  return { ok: true, realPath: finalReal };
}
