import { BRAND_FILES, BRAND_ROOT, type BrandDocumentKey } from "../../domain/brand/index.js";
import type { BrandSourceReaderPort, BrandWriterPort } from "./brand-ports.js";
import { planBrandMutation, type BrandMutationCommand, type BrandMutationPlanResult } from "./plan-brand-mutation.js";

export interface ApplyBrandMutationDependencies {
  readonly hashBytes: (bytes: Uint8Array) => string;
  readonly readSource: BrandSourceReaderPort;
  readonly createWriter: (rootDir: string) => BrandWriterPort;
}

export interface ApplyBrandMutationResult {
  readonly outcome: "applied" | "unchanged" | "conflict" | "write-error" | "verification-error";
  readonly wrote: boolean;
  readonly plan: BrandMutationPlanResult["plan"];
  readonly error: { readonly code: string; readonly message: string } | null;
}

function serialize(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function relativePath(key: BrandDocumentKey): string {
  return `${BRAND_ROOT}/${BRAND_FILES[key]}`;
}

export async function applyBrandMutation(
  input: { readonly executionDir: string },
  command: BrandMutationCommand,
  deps: ApplyBrandMutationDependencies,
): Promise<ApplyBrandMutationResult> {
  const snapshot = await deps.readSource.read(input.executionDir);
  const planned = planBrandMutation(snapshot, command);
  if (planned.outcome === "unchanged") {
    return { outcome: "unchanged", wrote: false, plan: planned.plan, error: null };
  }

  const files = (Object.keys(BRAND_FILES) as BrandDocumentKey[]).map((key) => {
    const bytes = serialize(planned.documents[key]);
    return {
      relativePath: relativePath(key),
      bytes,
      contentHash: deps.hashBytes(bytes),
      byteLength: bytes.byteLength,
    };
  });

  const writer = deps.createWriter(input.executionDir);
  const write = await writer.write({
    files,
    expectedCurrent: Object.fromEntries(
      (Object.keys(BRAND_FILES) as BrandDocumentKey[]).map((key) => [
        relativePath(key),
        snapshot.documents[key].contentHash,
      ]),
    ),
  });

  switch (write.outcome) {
    case "written":
      return { outcome: "applied", wrote: true, plan: planned.plan, error: null };
    case "unchanged":
      return { outcome: "unchanged", wrote: false, plan: planned.plan, error: null };
    case "concurrent-modification":
      return { outcome: "conflict", wrote: false, plan: planned.plan, error: write.error };
    case "verification-error":
      return { outcome: "verification-error", wrote: false, plan: planned.plan, error: write.error };
    default:
      return { outcome: "write-error", wrote: false, plan: planned.plan, error: write.error };
  }
}
