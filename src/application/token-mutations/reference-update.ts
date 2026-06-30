// T020 (008) — Motor de actualización de referencias (política v1: update-all-affected). Cuando un path
// se renombra/mueve (`fromPath`→`toPath`), reescribe TODA referencia de alias que apunte a ese path o a
// un descendiente, de modo que ningún alias quede roto. Puro: opera sobre el documento candidato.
import { isGroupNode, isTokenNode, aliasTargetOfValue, type PlainDoc } from "./document-model.js";
import { joinPath, rewritePrefix } from "../../domain/token-mutations/paths.js";

export interface ReferenceRewrite {
  readonly tokenPath: string;
  readonly before: string;
  readonly after: string;
}

/** Lista (sin mutar) las referencias que cambiarían si `fromPath`→`toPath` (incluye descendientes). */
export function collectReferenceRewrites(document: PlainDoc, fromPath: string, toPath: string): ReferenceRewrite[] {
  const out: ReferenceRewrite[] = [];
  function walk(node: PlainDoc, prefix: string | null): void {
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const child = node[key];
      const path = joinPath(prefix, key);
      if (isTokenNode(child)) {
        const target = aliasTargetOfValue(child.$value);
        if (target !== null) {
          const rewritten = rewritePrefix(target, fromPath, toPath);
          if (rewritten !== target) out.push({ tokenPath: path, before: target, after: rewritten });
        }
      } else if (isGroupNode(child)) {
        walk(child, path);
      }
    }
  }
  walk(document, null);
  return out.sort((a, b) => (a.tokenPath < b.tokenPath ? -1 : a.tokenPath > b.tokenPath ? 1 : 0));
}

/** Reescribe en el documento toda referencia afectada por `fromPath`→`toPath`. Devuelve los cambios. */
export function rewriteReferences(document: PlainDoc, fromPath: string, toPath: string): ReferenceRewrite[] {
  const rewrites = collectReferenceRewrites(document, fromPath, toPath);
  function walk(node: PlainDoc): void {
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const child = node[key];
      if (isTokenNode(child)) {
        const target = aliasTargetOfValue(child.$value);
        if (target !== null) {
          const rewritten = rewritePrefix(target, fromPath, toPath);
          if (rewritten !== target) child.$value = `{${rewritten}}`;
        }
      } else if (isGroupNode(child)) {
        walk(child);
      }
    }
  }
  walk(document);
  return rewrites;
}
