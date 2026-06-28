export type ApplicationConflictSeverity = "error" | "warning";

export interface ApplicationConflict {
  readonly code: string;
  readonly path: string | null;
  readonly severity: ApplicationConflictSeverity;
  readonly message: string;
  readonly blocksWrite: boolean;
  readonly proposedAction: string;
}
