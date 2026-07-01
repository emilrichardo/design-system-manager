// T022 (008) — Caso de uso headless `planTokenMutation` (READ-ONLY): snapshot → analyze → validate
// command → build candidate (con reescritura de referencias) → diff (enriquecido con referencias) →
// validate candidate. Produce `TokenMutationResultV1`. No escribe filesystem. El serializer del candidato
// se inyecta (infra) para no acoplar la aplicación al filesystem/crypto.
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { buildDiff, type TokenMutationDiffEntry } from "../../domain/token-mutations/diff.js";
import type { MutationIssue } from "../../domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { joinPath, lastSegment, parentPath } from "../../domain/token-mutations/paths.js";
import { buildCandidateDocument } from "./candidate-builder.js";
import { calculateDiff } from "./diff-calculator.js";
import { collectReferenceRewrites, rewriteReferences } from "./reference-update.js";
import { validateCommand } from "./validate-command.js";
import type { AnalyzedTokenSource, SourceSnapshotPort } from "./ports.js";
import type { PlainDoc } from "./document-model.js";

export interface SerializeCandidate {
  (document: unknown): { readonly text: string; readonly contentHash: string };
}

export interface PlanTokenMutationDependencies {
  readonly snapshot: SourceSnapshotPort;
  readonly serialize: SerializeCandidate;
}

/** Resultado interno de construir el plan a partir de una fuente ya leída; `candidateText` solo existe
 * cuando `result.outcome === "planned"` (lo usa `applyTokenMutation` para escribir sin reserializar). */
export interface MutationPlanComputation {
  readonly result: TokenMutationResultV1;
  readonly candidateText: string | null;
}

const CONFLICT_CODES = new Set(["rename-collision", "move-collision", "token-exists", "removal-with-dependents", "group-removal-non-empty", "concurrent-source-change"]);

export function readFailure(outcome: "not-found" | "read-error" | "invalid-design-system", reason: string): TokenMutationResultV1 {
  return Object.freeze({ outcome, wrote: false, plan: null, diff: null, conflicts: [], recovery: null, source: null, error: { code: outcome, message: reason, path: null, details: null } });
}

/** Destino de una operación de rename/move (token o grupo). */
function renameMoveTarget(op: TokenMutationCommandV1["operations"][number]): { from: string; to: string } | null {
  switch (op.kind) {
    case "rename-token":
    case "rename-group":
      return { from: op.path, to: joinPath(parentPath(op.path), op.newName) };
    case "move-token":
    case "move-group":
      return { from: op.path, to: joinPath(op.newParent, lastSegment(op.path)) };
    default:
      return null;
  }
}

/** Enriquece el diff con las referencias reescritas por cada rename/move (entradas `alias-changed`). */
function enrichDiff(baseEntries: readonly TokenMutationDiffEntry[], before: PlainDoc, command: TokenMutationCommandV1) {
  const entries: TokenMutationDiffEntry[] = baseEntries.map((e) => ({ ...e }));
  for (const op of command.operations) {
    const t = renameMoveTarget(op);
    if (t === null) continue;
    const rewrites = collectReferenceRewrites(before, t.from, t.to);
    if (rewrites.length === 0) continue;
    const refs = rewrites.map((r) => r.tokenPath);
    for (const e of entries) {
      if ((e.kind === "renamed" || e.kind === "moved" || e.kind === "group-changed") && e.previousPath === t.from) {
        (e as { references: readonly string[] }).references = refs;
      }
    }
    for (const r of rewrites) entries.push({ kind: "alias-changed", path: r.tokenPath, previousPath: null, before: r.before, after: r.after, references: [] });
  }
  return buildDiff(entries);
}

/** Construye el plan a partir de una fuente ya leída (sin I/O); compartido por `plan` y `apply` para que
 * `apply` solo lea el snapshot una vez y conozca el `rootDir` de esa misma lectura. */
export function buildMutationPlanComputation(source: AnalyzedTokenSource, command: TokenMutationCommandV1, serialize: SerializeCandidate): MutationPlanComputation {
  const before = source.document as PlainDoc;

  const issues = validateCommand(source, command);
  if (issues.length > 0) {
    const outcome = issues.some((i) => CONFLICT_CODES.has(i.code)) ? "conflict" : "invalid-command";
    return {
      candidateText: null,
      result: Object.freeze({
        outcome,
        wrote: false,
        plan: null,
        diff: null,
        conflicts: Object.freeze(issues as MutationIssue[]),
        recovery: null,
        source: source.identity,
        error: { code: outcome, message: "El comando no es válido.", path: null, details: null },
      }),
    };
  }

  // Candidato con reescritura de referencias (rename/move = update-all-affected).
  const candidate = buildCandidateDocument(before, command.operations, {
    resolveValue: (p) => source.resolvedValue(p),
    rewriteReferences,
  });
  const baseDiff = calculateDiff(before, candidate, command.operations);
  const diff = enrichDiff(baseDiff.entries, before, command);
  const { text, contentHash } = serialize(candidate);

  const plan = Object.freeze({ operations: command.operations, diff, candidateHash: contentHash, source: source.identity, writable: true });
  return {
    candidateText: text,
    result: Object.freeze({ outcome: "planned", wrote: false, plan, diff, conflicts: [], recovery: null, source: source.identity, error: null }),
  };
}

export async function planTokenMutation(input: { readonly executionDir: string }, command: TokenMutationCommandV1, deps: PlanTokenMutationDependencies): Promise<TokenMutationResultV1> {
  const read = await deps.snapshot.read(input);
  if (read.outcome !== "ready") return readFailure(read.outcome, read.reason);
  return buildMutationPlanComputation(read.source, command, deps.serialize).result;
}
