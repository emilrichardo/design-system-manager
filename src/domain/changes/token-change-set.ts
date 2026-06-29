// T037 (005) — Construcción VALIDADA y ordenada de un `TokenChangeSet` genérico (dominio puro). Es la
// frontera reutilizable que cualquier origen (preset hoy; importadores futuros) usará para normalizar
// cambios DTCG. NO compara contra un host, NO calcula diff, NO clasifica operaciones (eso es Checkpoint
// E): solo ordena de forma determinista, valida invariantes estructurales y deduce conteos. Devuelve un
// resultado tipado; nunca lanza ni deduplica silenciosamente. Sin presets/CLI/JSON/filesystem.
import { FOUNDATION_CATEGORY_IDS } from "../foundations/foundation-category.js";
import type { FoundationCategoryId } from "../foundations/foundation-category.js";
import type {
  TokenChange,
  TokenChangeNodeKind,
  TokenChangeOperation,
  TokenChangeSet,
} from "./token-change.js";

export type TokenChangeSetIssueCode =
  | "change-path-empty"
  | "change-path-duplicate"
  | "change-operation-invalid"
  | "change-node-kind-invalid"
  | "change-conflict-metadata-missing"
  | "change-conflict-metadata-unexpected"
  | "change-blocks-write-invalid"
  | "change-group-has-token-data"
  | "change-update-field-invalid";

export interface TokenChangeSetIssue {
  readonly code: TokenChangeSetIssueCode;
  readonly path: string;
  readonly detail: string;
}

export type TokenChangeSetResult =
  | { readonly ok: true; readonly changeSet: TokenChangeSet }
  | { readonly ok: false; readonly issues: readonly TokenChangeSetIssue[] };

/** Conteos derivados (por operación y por tipo de nodo) de un conjunto de cambios. */
export interface TokenChangeCounts {
  readonly byOperation: Readonly<Record<TokenChangeOperation, number>>;
  readonly byNodeKind: Readonly<Record<TokenChangeNodeKind, number>>;
  readonly blockingConflicts: number;
  readonly total: number;
}

const VALID_OPERATIONS: ReadonlySet<string> = new Set<TokenChangeOperation>(["create", "update", "unchanged", "conflict", "skip"]);
const VALID_NODE_KINDS: ReadonlySet<string> = new Set<TokenChangeNodeKind>(["group", "token"]);

function categoryRank(category: FoundationCategoryId): number {
  const index = FOUNDATION_CATEGORY_IDS.indexOf(category);
  return index === -1 ? FOUNDATION_CATEGORY_IDS.length : index;
}

/** Comparación de paths en orden de árbol (un ancestro-prefijo precede a sus descendientes). ASCII estable. */
function compareTreePath(a: string, b: string): number {
  const sa = a.split(".");
  const sb = b.split(".");
  const shared = Math.min(sa.length, sb.length);
  for (let i = 0; i < shared; i += 1) {
    const x = sa[i] as string;
    const y = sb[i] as string;
    if (x !== y) return x < y ? -1 : 1;
  }
  return sa.length - sb.length;
}

/** Orden canónico determinista: categoría (orden de `004`) y luego orden de árbol del path. */
function compareChange(a: TokenChange, b: TokenChange): number {
  const ra = categoryRank(a.category);
  const rb = categoryRank(b.category);
  if (ra !== rb) return ra - rb;
  return compareTreePath(a.path, b.path);
}

function validateChange(change: TokenChange): TokenChangeSetIssue[] {
  const issues: TokenChangeSetIssue[] = [];
  const at = (code: TokenChangeSetIssueCode, detail: string): void => {
    issues.push({ code, path: change.path, detail });
  };

  if (!VALID_OPERATIONS.has(change.operation)) at("change-operation-invalid", "Unknown change operation.");
  if (!VALID_NODE_KINDS.has(change.nodeKind)) at("change-node-kind-invalid", "Unknown node kind.");

  // Coherencia de metadata de conflicto.
  if (change.operation === "conflict" && change.conflict === null) {
    at("change-conflict-metadata-missing", "Conflict change must carry conflict metadata.");
  }
  if (change.operation !== "conflict" && change.conflict !== null) {
    at("change-conflict-metadata-unexpected", "Non-conflict change must not carry conflict metadata.");
  }

  // `blocksWrite` solo puede ser verdadero para conflictos; debe coincidir con la metadata.
  if (change.blocksWrite && change.operation !== "conflict") {
    at("change-blocks-write-invalid", "Only a conflict change may block the write.");
  }
  if (change.conflict !== null && change.conflict.blocksWrite !== change.blocksWrite) {
    at("change-blocks-write-invalid", "Change blocksWrite must match its conflict metadata.");
  }

  // Un grupo nunca porta datos exclusivos de token (`$value`).
  if (change.nodeKind === "group" && change.proposedToken !== null && "$value" in change.proposedToken) {
    at("change-group-has-token-data", "Group change must not propose a $value.");
  }

  // `update` solo puede completar `$description` (v1): el fragmento propuesto no admite otros campos.
  if (change.operation === "update" && change.proposedToken !== null) {
    const keys = Object.keys(change.proposedToken);
    if (keys.some((key) => key !== "$description")) {
      at("change-update-field-invalid", "An update may only complete a missing $description.");
    }
  }

  return issues;
}

/**
 * Construye un `TokenChangeSet` validado y ordenado. Detecta paths vacíos/duplicados e invariantes
 * estructurales; si hay issues devuelve `{ ok: false, issues }` (no deduplica, no elige uno
 * silenciosamente). El conjunto resultante es una copia inmutable en orden canónico determinista.
 */
export function createTokenChangeSet(changes: readonly TokenChange[]): TokenChangeSetResult {
  const issues: TokenChangeSetIssue[] = [];
  const seen = new Set<string>();

  for (const change of changes) {
    if (change.path.length === 0) {
      issues.push({ code: "change-path-empty", path: change.path, detail: "Change path must not be empty." });
    } else if (seen.has(change.path)) {
      issues.push({ code: "change-path-duplicate", path: change.path, detail: "Duplicate change path." });
    } else {
      seen.add(change.path);
    }
    issues.push(...validateChange(change));
  }

  if (issues.length > 0) return { ok: false, issues };

  const ordered = [...changes].sort(compareChange);
  return { ok: true, changeSet: { changes: ordered } };
}

/** Deriva conteos por operación y por tipo de nodo (determinista; no muta). */
export function tokenChangeSetCounts(changeSet: TokenChangeSet): TokenChangeCounts {
  const byOperation: Record<TokenChangeOperation, number> = { create: 0, update: 0, unchanged: 0, conflict: 0, skip: 0 };
  const byNodeKind: Record<TokenChangeNodeKind, number> = { group: 0, token: 0 };
  let blockingConflicts = 0;

  for (const change of changeSet.changes) {
    byOperation[change.operation] += 1;
    byNodeKind[change.nodeKind] += 1;
    if (change.blocksWrite) blockingConflicts += 1;
  }

  return { byOperation, byNodeKind, blockingConflicts, total: changeSet.changes.length };
}
