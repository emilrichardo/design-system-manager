// T035 (008) — Mapper explícito `TokenMutationResultV1` → `TokenMutationJsonEnvelopeV1` (sin cast
// estructural). Preserva paths lógicos, null policy y orden estable; nunca expone bytes crudos, nodos
// parseados ni `Error`/stack. `command` distingue `token-plan`/`token-apply`; `internal-error` solo lo
// produce el mapper dedicado (frontera adapter), nunca este.
import type { TokenMutationDiffV1 } from "../../../domain/token-mutations/diff.js";
import type { MutationIssue } from "../../../domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../../domain/token-mutations/result.js";
import { TOKEN_MUTATION_JSON_FORMAT_VERSION } from "./format-version.js";
import type {
  TokenMutationJsonCommandV1,
  TokenMutationJsonConflictV1,
  TokenMutationJsonDiffV1,
  TokenMutationJsonEnvelopeV1,
} from "./dto.js";

function mapDiff(diff: TokenMutationDiffV1): TokenMutationJsonDiffV1 {
  return {
    entries: diff.entries.map((e) => ({ kind: e.kind, path: e.path, previousPath: e.previousPath, before: e.before, after: e.after, references: [...e.references] })),
    summary: { ...diff.summary },
  };
}

function mapConflict(c: MutationIssue): TokenMutationJsonConflictV1 {
  return { code: c.code, path: c.path, severity: c.severity, message: c.message, blocksApply: c.blocksApply, dependents: [...c.dependents] };
}

export function toTokenMutationJsonEnvelope(command: TokenMutationJsonCommandV1, result: TokenMutationResultV1): TokenMutationJsonEnvelopeV1 {
  return {
    formatVersion: TOKEN_MUTATION_JSON_FORMAT_VERSION,
    command,
    outcome: result.outcome,
    result: {
      wrote: result.wrote,
      plan: result.plan === null ? null : { candidateHash: result.plan.candidateHash, writable: result.plan.writable, diff: mapDiff(result.plan.diff) },
      diff: result.diff === null ? null : mapDiff(result.diff),
      conflicts: result.conflicts.map(mapConflict),
      recovery:
        result.recovery === null
          ? null
          : {
              sourceAvailable: result.recovery.sourceAvailable,
              backupRelativePath: result.recovery.backupRelativePath,
              recoveryRequired: result.recovery.recoveryRequired,
            },
      source: result.source === null ? null : { logicalPath: result.source.logicalPath, contentHash: result.source.contentHash },
      error: result.error === null ? null : { code: result.error.code, message: result.error.message, path: result.error.path },
    },
    error: null,
  };
}
