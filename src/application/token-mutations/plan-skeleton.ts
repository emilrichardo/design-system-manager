// T015 (008) — Ensamblaje preliminar del plan (read-only): operations + diff + candidateHash + source.
// SIN validación completa todavía (llega en C, que también inyecta la reescritura de referencias). Puro:
// el serializer del candidato se inyecta (infra) para no acoplar la aplicación al filesystem/crypto.
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import type { TokenMutationPlanV1 } from "../../domain/token-mutations/result.js";
import { buildCandidateDocument, type CandidateBuildOptions } from "./candidate-builder.js";
import { calculateDiff } from "./diff-calculator.js";
import type { AnalyzedTokenSource } from "./ports.js";
import type { PlainDoc } from "./document-model.js";

export interface SerializeCandidate {
  (document: unknown): { readonly contentHash: string };
}

export interface BuildPlanOptions extends CandidateBuildOptions {
  /** `false` si la validación (C) detectó issues bloqueantes. Por defecto `true` (skeleton sin validar). */
  readonly writable?: boolean;
}

/**
 * Construye el plan a partir de la fuente analizada y el comando. Read-only: no escribe. Determinista:
 * misma fuente + comando ⇒ mismo plan/diff/candidateHash.
 */
export function buildPlanSkeleton(
  source: AnalyzedTokenSource,
  command: TokenMutationCommandV1,
  serialize: SerializeCandidate,
  options: BuildPlanOptions = {},
): TokenMutationPlanV1 {
  const before = source.document as PlainDoc;
  const candidate = buildCandidateDocument(before, command.operations, {
    resolveValue: options.resolveValue ?? ((p) => source.resolvedValue(p)),
    ...(options.rewriteReferences ? { rewriteReferences: options.rewriteReferences } : {}),
  });
  const diff = calculateDiff(before, candidate, command.operations);
  const { contentHash } = serialize(candidate);
  return Object.freeze({
    operations: command.operations,
    diff,
    candidateHash: contentHash,
    source: source.identity,
    writable: options.writable ?? true,
  });
}
