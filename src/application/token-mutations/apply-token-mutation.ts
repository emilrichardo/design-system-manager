// T027–T030 (008) — Caso de uso headless `applyTokenMutation`: re-deriva el plan reutilizando UNA sola
// lectura del snapshot (misma validación/candidate/diff que `planTokenMutation`); decide idempotencia
// (`unchanged`) antes de tocar el writer; publica transaccionalmente solo si el comando es `writable`;
// traduce el resultado del writer (concurrencia, escritura, verificación, recovery) a
// `TokenMutationResultV1`. Approval boundary: nunca escribe si hay issues bloqueantes o cambio
// concurrente. Sin rollback automático tras el commit point — esa decisión vive en el writer.
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { issue, type MutationRecoveryState, type SafeMutationError } from "../../domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { buildMutationPlanComputation, readFailure, type SerializeCandidate } from "./plan-token-mutation.js";
import type { SourceSnapshotPort, TokenSourceWriterFactory } from "./ports.js";

export interface ApplyTokenMutationDependencies {
  readonly snapshot: SourceSnapshotPort;
  readonly serialize: SerializeCandidate;
  readonly createWriter: TokenSourceWriterFactory;
}

function unchangedResult(plan: NonNullable<TokenMutationResultV1["plan"]>, diff: TokenMutationResultV1["diff"]): TokenMutationResultV1 {
  return Object.freeze({ outcome: "unchanged", wrote: false, plan, diff, conflicts: [], recovery: null, source: plan.source, error: null });
}

export async function applyTokenMutation(
  input: { readonly executionDir: string },
  command: TokenMutationCommandV1,
  deps: ApplyTokenMutationDependencies,
): Promise<TokenMutationResultV1> {
  const read = await deps.snapshot.read(input);
  if (read.outcome !== "ready") return readFailure(read.outcome, read.reason);

  const { result, candidateText } = buildMutationPlanComputation(read.source, command, deps.serialize);
  if (result.outcome !== "planned" || result.plan === null || candidateText === null) return result;

  const plan = result.plan;

  // T028 — idempotencia: candidato == fuente actual ⇒ `unchanged`, sin tocar el writer.
  if (plan.candidateHash === plan.source.contentHash) return unchangedResult(plan, result.diff);

  const writer = deps.createWriter(read.rootDir);
  const write = await writer.write({ candidateText, candidateHash: plan.candidateHash, expectedSourceHash: plan.source.contentHash });

  if (write.outcome === "unchanged") return unchangedResult(plan, result.diff);

  // T029 — cambio concurrente detectado por el writer (snapshot identity ya no coincide con el disco).
  if (write.outcome === "concurrent-modification") {
    const conflict = issue("concurrent-source-change", null, "La fuente de tokens cambió antes de escribir.");
    return Object.freeze({ outcome: "conflict", wrote: false, plan, diff: result.diff, conflicts: [conflict], recovery: null, source: plan.source, error: null });
  }

  // T030 — recovery/verification: el writer ya decidió disponibilidad de fuente, backup y necesidad de recovery.
  const recovery: MutationRecoveryState = {
    sourceAvailable: write.sourceAvailable,
    backupRelativePath: write.backupRelativePath,
    recoveryRequired: write.recoveryRequired,
  };

  if (write.outcome === "write-error" || write.outcome === "verification-error") {
    const error: SafeMutationError = {
      code: write.error?.code ?? write.outcome,
      message: write.error?.message ?? "No se pudo escribir la fuente de tokens.",
      path: null,
      details: null,
    };
    return Object.freeze({ outcome: write.outcome, wrote: false, plan, diff: result.diff, conflicts: [], recovery, source: plan.source, error });
  }

  // write.outcome === "written"
  return Object.freeze({ outcome: "applied", wrote: true, plan, diff: result.diff, conflicts: [], recovery, source: plan.source, error: null });
}
