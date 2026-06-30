// T001 (008) — Operación de mutación de tokens: unión discriminada de 15 operaciones (token/grupo).
// Dominio puro e inmutable: sin filesystem, sin CLI, sin `Error`. Los paths son lógicos (`a.b.c`); los
// valores son DTCG JSON-safe. No persiste un campo `category` propio: `update-category` edita la
// metadata Neuraz bajo `$extensions` (la categoría foundation de 004 es path-derived y read-only).

/** Valor DTCG JSON-safe (objeto/escala/array; nunca bytes ni `Error`). */
export type DtcgValue = unknown;

export type TokenOperationKind =
  | "create-token"
  | "update-value"
  | "update-type"
  | "update-description"
  | "update-category"
  | "set-alias"
  | "remove-alias"
  | "rename-token"
  | "move-token"
  | "duplicate-token"
  | "remove-token";

export type GroupOperationKind = "create-group" | "rename-group" | "move-group" | "remove-empty-group";

export type TokenMutationOperationKind = TokenOperationKind | GroupOperationKind;

export const TOKEN_MUTATION_OPERATION_KINDS: readonly TokenMutationOperationKind[] = [
  "create-token",
  "update-value",
  "update-type",
  "update-description",
  "update-category",
  "set-alias",
  "remove-alias",
  "rename-token",
  "move-token",
  "duplicate-token",
  "remove-token",
  "create-group",
  "rename-group",
  "move-group",
  "remove-empty-group",
] as const;

export interface CreateTokenOp {
  readonly kind: "create-token";
  readonly path: string;
  readonly value: DtcgValue;
  readonly type: string;
  readonly description?: string;
  /** Metadata de clasificación Neuraz (`$extensions`); nunca la categoría path-derived de 004. */
  readonly category?: string;
}
export interface UpdateValueOp {
  readonly kind: "update-value";
  readonly path: string;
  readonly value: DtcgValue;
}
export interface UpdateTypeOp {
  readonly kind: "update-type";
  readonly path: string;
  readonly type: string;
}
export interface UpdateDescriptionOp {
  readonly kind: "update-description";
  readonly path: string;
  readonly description: string | null;
}
export interface UpdateCategoryOp {
  readonly kind: "update-category";
  readonly path: string;
  /** Metadata de clasificación Neuraz (`$extensions`); `null` la limpia. */
  readonly category: string | null;
}
export interface SetAliasOp {
  readonly kind: "set-alias";
  readonly path: string;
  readonly target: string;
}
export interface RemoveAliasOp {
  readonly kind: "remove-alias";
  readonly path: string;
}
export interface RenameTokenOp {
  readonly kind: "rename-token";
  readonly path: string;
  readonly newName: string;
}
export interface MoveTokenOp {
  readonly kind: "move-token";
  readonly path: string;
  readonly newParent: string;
}
export interface DuplicateTokenOp {
  readonly kind: "duplicate-token";
  readonly path: string;
  readonly destinationPath: string;
}
export interface RemoveTokenOp {
  readonly kind: "remove-token";
  readonly path: string;
}
export interface CreateGroupOp {
  readonly kind: "create-group";
  readonly path: string;
  readonly description?: string;
}
export interface RenameGroupOp {
  readonly kind: "rename-group";
  readonly path: string;
  readonly newName: string;
}
export interface MoveGroupOp {
  readonly kind: "move-group";
  readonly path: string;
  readonly newParent: string;
}
export interface RemoveEmptyGroupOp {
  readonly kind: "remove-empty-group";
  readonly path: string;
}

export type TokenMutationOperationV1 =
  | CreateTokenOp
  | UpdateValueOp
  | UpdateTypeOp
  | UpdateDescriptionOp
  | UpdateCategoryOp
  | SetAliasOp
  | RemoveAliasOp
  | RenameTokenOp
  | MoveTokenOp
  | DuplicateTokenOp
  | RemoveTokenOp
  | CreateGroupOp
  | RenameGroupOp
  | MoveGroupOp
  | RemoveEmptyGroupOp;

/** Guard de runtime del discriminante. */
export function isTokenMutationOperationKind(value: unknown): value is TokenMutationOperationKind {
  return typeof value === "string" && (TOKEN_MUTATION_OPERATION_KINDS as readonly string[]).includes(value);
}
