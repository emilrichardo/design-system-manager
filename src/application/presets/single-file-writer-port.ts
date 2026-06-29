export type SingleFileWriteOutcome =
  | "written"
  | "path-error"
  | "temp-create-error"
  | "write-error"
  | "temp-verify-error"
  | "before-rename-error"
  | "rename-error"
  | "cleanup-error"
  | "concurrent-modification";

export interface SingleFileWriteRequest {
  readonly rootDir: string;
  readonly relativePath: string;
  readonly content: string;
  readonly expectedContent: string;
  readonly createBackup: boolean;
}

export interface SingleFileWriteResult {
  readonly outcome: SingleFileWriteOutcome;
  readonly wrote: boolean;
  readonly relativePath: string;
  readonly backupRelativePath: string | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface SingleFileBackupCleanupResult {
  readonly ok: boolean;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface SingleFileAtomicWriter {
  write(request: SingleFileWriteRequest): Promise<SingleFileWriteResult>;
  cleanupBackup(rootDir: string, backupRelativePath: string): Promise<SingleFileBackupCleanupResult>;
}

export type PresetTargetReadOutcome = "success" | "not-found" | "read-error";

export interface PresetTargetReadRequest {
  readonly rootDir: string;
  readonly relativePath: string;
}

export type PresetTargetReadResult =
  | { readonly outcome: "success"; readonly content: string }
  | { readonly outcome: "not-found" | "read-error"; readonly content: null; readonly error: string };

export interface PresetTargetReader {
  read(request: PresetTargetReadRequest): Promise<PresetTargetReadResult>;
}
