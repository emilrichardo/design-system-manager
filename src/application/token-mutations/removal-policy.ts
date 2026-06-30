// T021 (008) — Políticas de eliminación. Eliminar un token con dependientes BLOQUEA por defecto (sin
// `--force`); eliminar un grupo no vacío BLOQUEA (solo `remove-empty-group` y solo si está vacío). Puro.
import { issue, type MutationIssue } from "../../domain/token-mutations/outcome.js";
import { isWithin } from "../../domain/token-mutations/paths.js";

/** Dependientes de `path` que NO se eliminan en el mismo comando. */
export function blockingDependents(dependents: readonly string[], removedInCommand: ReadonlySet<string>): string[] {
  return dependents.filter((d) => !removedInCommand.has(d)).sort();
}

/** Issue de `removal-with-dependents` o `null` si no hay dependientes bloqueantes. */
export function checkRemovalDependents(path: string, dependents: readonly string[], removedInCommand: ReadonlySet<string>): MutationIssue | null {
  const deps = blockingDependents(dependents, removedInCommand);
  if (deps.length === 0) return null;
  return issue("removal-with-dependents", path, `No se puede eliminar ${path}: lo aliasan ${deps.join(", ")}.`, { dependents: deps });
}

/** ¿El grupo en `groupPath` tiene algún token o grupo descendiente en `allPaths`? */
export function groupHasDescendants(groupPath: string, allPaths: Iterable<string>): boolean {
  for (const p of allPaths) {
    if (p !== groupPath && isWithin(groupPath, p)) return true;
  }
  return false;
}

/** Issue de `group-removal-non-empty` o `null` si el grupo está vacío. */
export function checkGroupRemoval(groupPath: string, allPaths: Iterable<string>): MutationIssue | null {
  if (!groupHasDescendants(groupPath, allPaths)) return null;
  return issue("group-removal-non-empty", groupPath, `No se puede eliminar el grupo no vacío ${groupPath}; vacíelo primero.`);
}
