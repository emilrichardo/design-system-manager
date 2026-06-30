// Helpers de tests de mutaciones (008): construye una AnalyzedTokenSource desde un documento literal y un
// SourceSnapshotPort fake. NO es un archivo de test.
import { analyzedTokenSource } from "../../../src/application/token-mutations/analyze-source.js";
import type { AnalyzedTokenSource, SourceSnapshotPort } from "../../../src/application/token-mutations/ports.js";
import { createTokenMutationCommand } from "../../../src/domain/token-mutations/command.js";
import type { TokenMutationOperationV1 } from "../../../src/domain/token-mutations/operation.js";

export function sourceFrom(document: unknown, contentHash = "a".repeat(64)): AnalyzedTokenSource {
  return analyzedTokenSource(document, { logicalPath: "design-system/tokens/base.tokens.json", contentHash });
}

export function fakeSnapshot(source: AnalyzedTokenSource): SourceSnapshotPort {
  return { read: () => Promise.resolve({ outcome: "ready", source }) };
}

export const stubSerialize = (): { contentHash: string } => ({ contentHash: "c".repeat(64) });

export const command = (...operations: TokenMutationOperationV1[]) => createTokenMutationCommand(operations);

/** Documento con un token concreto y un alias que lo referencia. */
export function aliasedDoc(): unknown {
  return {
    color: { brand: { 500: { $type: "color", $value: "#3b82f6" } } },
    accent: { $type: "color", $value: "{color.brand.500}" },
  };
}
