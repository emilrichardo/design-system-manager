// T010 (008) — Cálculo determinista del diff a partir de (documento previo, documento candidato,
// operaciones). Orientado a operaciones: cada operación produce su(s) entrada(s) con valores públicos
// seguros leídos de los mapas previo/posterior. Las referencias reescritas (rename/move) las completa el
// motor de C; aquí quedan en `[]`. Puro.
import type { TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";
import { buildDiff, type TokenMutationDiffEntry, type TokenMutationDiffV1 } from "../../domain/token-mutations/diff.js";
import { joinPath, lastSegment, parentPath } from "../../domain/token-mutations/paths.js";
import { tokenSummaryMap, type PlainDoc, type TokenSummary } from "./document-model.js";

function entry(
  kind: TokenMutationDiffEntry["kind"],
  path: string,
  opts: { previousPath?: string | null; before?: unknown; after?: unknown; references?: readonly string[] } = {},
): TokenMutationDiffEntry {
  return {
    kind,
    path,
    previousPath: opts.previousPath ?? null,
    before: opts.before ?? null,
    after: opts.after ?? null,
    references: opts.references ?? [],
  };
}

/** Calcula el diff de un conjunto de operaciones. `references` se rellena en C para rename/move. */
export function calculateDiff(beforeDoc: PlainDoc, afterDoc: PlainDoc, operations: readonly TokenMutationOperationV1[]): TokenMutationDiffV1 {
  const before = tokenSummaryMap(beforeDoc);
  const after = tokenSummaryMap(afterDoc);
  const entries: TokenMutationDiffEntry[] = [];
  const valOf = (m: Map<string, TokenSummary>, p: string): unknown => m.get(p)?.value ?? null;

  for (const op of operations) {
    switch (op.kind) {
      case "create-token":
        entries.push(entry("added", op.path, { after: valOf(after, op.path) }));
        break;
      case "duplicate-token":
        entries.push(entry("added", op.destinationPath, { after: valOf(after, op.destinationPath) }));
        break;
      case "update-value":
        entries.push(entry("updated", op.path, { before: valOf(before, op.path), after: valOf(after, op.path) }));
        break;
      case "update-type":
        entries.push(entry("updated", op.path, { before: before.get(op.path)?.type ?? null, after: after.get(op.path)?.type ?? null }));
        break;
      case "update-description":
        entries.push(entry("metadata-changed", op.path, { before: before.get(op.path)?.description ?? null, after: after.get(op.path)?.description ?? null }));
        break;
      case "update-category":
        entries.push(entry("metadata-changed", op.path, { before: before.get(op.path)?.category ?? null, after: after.get(op.path)?.category ?? null }));
        break;
      case "set-alias":
        entries.push(entry("alias-changed", op.path, { before: before.get(op.path)?.aliasTarget ?? null, after: op.target }));
        break;
      case "remove-alias":
        entries.push(entry("alias-changed", op.path, { before: before.get(op.path)?.aliasTarget ?? null, after: null }));
        entries.push(entry("updated", op.path, { before: valOf(before, op.path), after: valOf(after, op.path) }));
        break;
      case "rename-token":
        entries.push(entry("renamed", joinPath(parentPath(op.path), op.newName), { previousPath: op.path }));
        break;
      case "move-token":
        entries.push(entry("moved", joinPath(op.newParent, lastSegment(op.path)), { previousPath: op.path }));
        break;
      case "remove-token":
        entries.push(entry("removed", op.path, { before: valOf(before, op.path) }));
        break;
      case "create-group":
        entries.push(entry("group-changed", op.path, { after: "created" }));
        break;
      case "rename-group":
        entries.push(entry("group-changed", joinPath(parentPath(op.path), op.newName), { previousPath: op.path }));
        break;
      case "move-group":
        entries.push(entry("group-changed", joinPath(op.newParent, lastSegment(op.path)), { previousPath: op.path }));
        break;
      case "remove-empty-group":
        entries.push(entry("group-changed", op.path, { before: "group" }));
        break;
      default: {
        const _exhaustive: never = op;
        void _exhaustive;
      }
    }
  }
  return buildDiff(entries);
}
