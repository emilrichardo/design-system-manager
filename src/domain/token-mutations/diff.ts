// T002 (008) — Diff de mutación: cambios por path con valores públicos seguros. Dominio puro. Sin bytes,
// sin nodos parseados internos, sin rutas absolutas. Orden determinista (por path, luego kind).

export type TokenMutationDiffKind =
  | "added"
  | "updated"
  | "renamed"
  | "moved"
  | "removed"
  | "alias-changed"
  | "metadata-changed"
  | "group-changed";

export const TOKEN_MUTATION_DIFF_KINDS: readonly TokenMutationDiffKind[] = [
  "added",
  "updated",
  "renamed",
  "moved",
  "removed",
  "alias-changed",
  "metadata-changed",
  "group-changed",
] as const;

/** Valor público seguro (JSON-safe): valor resuelto/declarado, alias target, descripción o categoría. */
export type SafePublicValue = unknown;

export interface TokenMutationDiffEntry {
  readonly kind: TokenMutationDiffKind;
  /** Path lógico afectado (path post-estado para `renamed`/`moved`). */
  readonly path: string;
  /** Path previo para `renamed`/`moved`; `null` en otros casos. */
  readonly previousPath: string | null;
  readonly before: SafePublicValue | null;
  readonly after: SafePublicValue | null;
  /** Paths lógicos de aliases reescritos a causa de esta entrada. */
  readonly references: readonly string[];
}

export interface TokenMutationDiffSummary {
  readonly added: number;
  readonly updated: number;
  readonly renamed: number;
  readonly moved: number;
  readonly removed: number;
  readonly aliasChanged: number;
  readonly metadataChanged: number;
  readonly groupChanged: number;
}

export interface TokenMutationDiffV1 {
  readonly entries: readonly TokenMutationDiffEntry[];
  readonly summary: TokenMutationDiffSummary;
}

const KIND_RANK: Readonly<Record<TokenMutationDiffKind, number>> = {
  added: 0,
  updated: 1,
  renamed: 2,
  moved: 3,
  removed: 4,
  "alias-changed": 5,
  "metadata-changed": 6,
  "group-changed": 7,
};

/** Ordena entradas de forma estable y determinista: por path (bytewise), luego por kind. */
export function orderDiffEntries(entries: readonly TokenMutationDiffEntry[]): TokenMutationDiffEntry[] {
  return [...entries].sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return KIND_RANK[a.kind] - KIND_RANK[b.kind];
  });
}

/** Calcula el summary de conteos a partir de las entradas. */
export function summarizeDiff(entries: readonly TokenMutationDiffEntry[]): TokenMutationDiffSummary {
  const s: TokenMutationDiffSummary = { added: 0, updated: 0, renamed: 0, moved: 0, removed: 0, aliasChanged: 0, metadataChanged: 0, groupChanged: 0 };
  const inc: Record<TokenMutationDiffKind, keyof TokenMutationDiffSummary> = {
    added: "added",
    updated: "updated",
    renamed: "renamed",
    moved: "moved",
    removed: "removed",
    "alias-changed": "aliasChanged",
    "metadata-changed": "metadataChanged",
    "group-changed": "groupChanged",
  };
  const counts = { ...s } as Record<keyof TokenMutationDiffSummary, number>;
  for (const e of entries) counts[inc[e.kind]] += 1;
  return Object.freeze(counts);
}

/** Construye un diff inmutable y determinista a partir de entradas sin ordenar. */
export function buildDiff(entries: readonly TokenMutationDiffEntry[]): TokenMutationDiffV1 {
  const ordered = orderDiffEntries(entries).map((e) => Object.freeze({ ...e, references: Object.freeze([...e.references]) }));
  return Object.freeze({ entries: Object.freeze(ordered), summary: summarizeDiff(ordered) });
}

/** Diff vacío (no-op). */
export const EMPTY_DIFF: TokenMutationDiffV1 = buildDiff([]);
