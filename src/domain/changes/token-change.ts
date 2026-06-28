import type { FoundationCategoryId } from "../foundations/foundation-category.js";
import type { FoundationLevel } from "../foundations/foundation-level.js";
import type { ApplicationConflict } from "./application-conflict.js";

export type TokenChangeOperation = "create" | "update" | "unchanged" | "conflict" | "skip";

export type TokenChangeNodeKind = "group" | "token";

export type ProposedTokenFragment = Readonly<Record<string, unknown>>;

export interface TokenChange {
  readonly path: string;
  readonly nodeKind: TokenChangeNodeKind;
  readonly category: FoundationCategoryId;
  readonly level: FoundationLevel;
  readonly operation: TokenChangeOperation;
  readonly reason: string;
  readonly blocksWrite: boolean;
  readonly conflict: ApplicationConflict | null;
  readonly proposedToken: ProposedTokenFragment | null;
}

export interface TokenChangeSet {
  readonly changes: readonly TokenChange[];
}

export function tokenChangeSet(changes: readonly TokenChange[] = []): TokenChangeSet {
  return { changes: [...changes] };
}
