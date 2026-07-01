import type { BrandSourceSnapshot } from "../../domain/brand/index.js";

export interface BrandSourceReaderPort {
  read(rootDir: string): Promise<BrandSourceSnapshot>;
}

export interface BrandWriteFile {
  readonly relativePath: string;
  readonly bytes: Uint8Array;
  readonly contentHash: string;
  readonly byteLength: number;
}

export interface BrandWriteRequest {
  readonly files: readonly BrandWriteFile[];
  readonly expectedCurrent: Readonly<Record<string, string | null>>;
}

export interface BrandWriteResult {
  readonly outcome: "written" | "unchanged" | "concurrent-modification" | "write-error" | "verification-error";
  readonly wrote: boolean;
  readonly brandAvailable: boolean;
  readonly recoveryRequired: boolean;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface BrandWriterPort {
  write(request: BrandWriteRequest): Promise<BrandWriteResult>;
}
