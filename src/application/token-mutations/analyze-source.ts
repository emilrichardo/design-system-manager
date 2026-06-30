// T012 (008) — Vista analizada de la fuente como proyección PURA sobre el documento ya parseado (no
// re-parsea ni re-lee: la única lectura/parse/análisis la hace el snapshot reader de infraestructura
// reusando `006`/`002`). Resuelve cadenas de alias con guarda de ciclos para exponer target/type/value
// efectivos y los dependientes.
import type { SourceSnapshotIdentity } from "../../domain/token-mutations/outcome.js";
import { getNode, isGroupNode, isPlainObject, isTokenNode, tokenSummaryMap, type PlainDoc } from "./document-model.js";
import type { AnalyzedTokenSource } from "./ports.js";

export function analyzedTokenSource(document: unknown, identity: SourceSnapshotIdentity): AnalyzedTokenSource {
  const doc: PlainDoc = isPlainObject(document) ? document : {};
  const summary = tokenSummaryMap(doc);

  // Mapa inverso de dependencias: target → tokens que lo aliasan directamente.
  const directDependents = new Map<string, string[]>();
  for (const [path, s] of summary) {
    if (s.aliasTarget !== null) {
      const list = directDependents.get(s.aliasTarget) ?? [];
      list.push(path);
      directDependents.set(s.aliasTarget, list);
    }
  }

  /** Sigue la cadena de alias desde `path` hasta un token concreto; devuelve el path final o null si rota/cíclica. */
  function resolveChain(path: string): string | null {
    const seen = new Set<string>();
    let cur = path;
    for (;;) {
      if (seen.has(cur)) return null; // ciclo
      seen.add(cur);
      const s = summary.get(cur);
      if (s === undefined) return null; // referencia rota
      if (s.aliasTarget === null) return cur;
      cur = s.aliasTarget;
    }
  }

  return {
    document: doc,
    identity,
    hasToken: (path) => isTokenNode(getNode(doc, path)),
    hasGroup: (path) => isGroupNode(getNode(doc, path)),
    tokenPaths: () => [...summary.keys()],
    aliasTargetOf: (path) => summary.get(path)?.aliasTarget ?? null,
    effectiveType: (path) => {
      const final = resolveChain(path);
      return final === null ? null : summary.get(final)?.type ?? null;
    },
    resolvedValue: (path) => {
      const final = resolveChain(path);
      return final === null ? null : structuredClone(summary.get(final)?.value ?? null);
    },
    dependentsOf: (path) => {
      // Cierre transitivo de dependientes (quienes resuelven, directa o transitivamente, a `path`).
      const out = new Set<string>();
      const stack = [path];
      while (stack.length > 0) {
        const cur = stack.pop() as string;
        for (const dep of directDependents.get(cur) ?? []) {
          if (!out.has(dep)) {
            out.add(dep);
            stack.push(dep);
          }
        }
      }
      return [...out].sort();
    },
  };
}
