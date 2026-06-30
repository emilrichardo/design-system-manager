// T009 (008) — Constructor del documento candidato. Aplica las operaciones EN ORDEN a un clon del
// documento (nunca muta la entrada); preserva contenido desconocido y orden. Puro y read-only respecto
// al filesystem. La reescritura de referencias en rename/move la realiza el motor de C (se inyecta como
// callback `rewriteReferences`); el builder hace el cambio estructural. `remove-alias` inlina el valor
// resuelto provisto por `resolveValue`.
import type { TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";
import { joinPath, lastSegment, parentPath } from "../../domain/token-mutations/paths.js";
import {
  cloneDoc,
  deleteNode,
  getNode,
  isPlainObject,
  isTokenNode,
  setNeurazCategory,
  setNode,
  type PlainDoc,
} from "./document-model.js";

export interface CandidateBuildOptions {
  /** Valor concreto resuelto para `remove-alias` (lo provee el caso de uso desde el análisis). */
  readonly resolveValue?: (path: string) => unknown;
  /** Reescribe referencias `{from}`→`{to}` en el documento (motor de C); no-op por defecto. */
  readonly rewriteReferences?: (document: PlainDoc, fromPath: string, toPath: string) => void;
}

function tokenNodeAt(document: PlainDoc, path: string): PlainDoc | null {
  const node = getNode(document, path);
  return isTokenNode(node) ? node : null;
}

function applyOne(document: PlainDoc, op: TokenMutationOperationV1, options: CandidateBuildOptions): void {
  const rewrite = options.rewriteReferences ?? (() => undefined);
  switch (op.kind) {
    case "create-token": {
      const node: PlainDoc = { $type: op.type, $value: op.value };
      if (op.description !== undefined) node.$description = op.description;
      if (op.category !== undefined) setNeurazCategory(node, op.category);
      setNode(document, op.path, node);
      return;
    }
    case "update-value": {
      const n = tokenNodeAt(document, op.path);
      if (n) n.$value = op.value;
      return;
    }
    case "update-type": {
      const n = tokenNodeAt(document, op.path);
      if (n) n.$type = op.type;
      return;
    }
    case "update-description": {
      const n = tokenNodeAt(document, op.path);
      if (!n) return;
      if (op.description === null) delete n.$description;
      else n.$description = op.description;
      return;
    }
    case "update-category": {
      const n = tokenNodeAt(document, op.path);
      if (n) setNeurazCategory(n, op.category);
      return;
    }
    case "set-alias": {
      const n = tokenNodeAt(document, op.path);
      if (n) n.$value = `{${op.target}}`;
      return;
    }
    case "remove-alias": {
      const n = tokenNodeAt(document, op.path);
      if (n) n.$value = options.resolveValue ? options.resolveValue(op.path) : n.$value;
      return;
    }
    case "rename-token":
    case "rename-group": {
      const node = getNode(document, op.path);
      if (node === undefined) return;
      const target = joinPath(parentPath(op.path), op.newName);
      deleteNode(document, op.path);
      setNode(document, target, node);
      rewrite(document, op.path, target);
      return;
    }
    case "move-token":
    case "move-group": {
      const node = getNode(document, op.path);
      if (node === undefined) return;
      const target = joinPath(op.newParent, lastSegment(op.path));
      deleteNode(document, op.path);
      setNode(document, target, node);
      rewrite(document, op.path, target);
      return;
    }
    case "duplicate-token": {
      const node = getNode(document, op.path);
      if (isPlainObject(node)) setNode(document, op.destinationPath, structuredClone(node));
      return;
    }
    case "remove-token":
    case "remove-empty-group": {
      deleteNode(document, op.path);
      return;
    }
    case "create-group": {
      const node: PlainDoc = {};
      if (op.description !== undefined) node.$description = op.description;
      setNode(document, op.path, node);
      return;
    }
    default: {
      const _exhaustive: never = op;
      void _exhaustive;
    }
  }
}

/** Aplica las operaciones a un clon del documento y devuelve el documento candidato. No muta la entrada. */
export function buildCandidateDocument(document: unknown, operations: readonly TokenMutationOperationV1[], options: CandidateBuildOptions = {}): PlainDoc {
  const candidate = cloneDoc(document);
  for (const op of operations) applyOne(candidate, op, options);
  return candidate;
}
