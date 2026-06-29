// Helpers compartidos para los tests de manifest y ownership (Checkpoint F). NO es un test.
import { createBuildArtifact, type BuildArtifact } from "../../../src/domain/build-export/artifact.js";
import { artifactContentType, artifactFilename, type BuildFormat } from "../../../src/domain/build-export/build-format.js";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";
import type { RequiredPathNode } from "../../../src/application/build-export/ownership.js";

/** Hash SHA-256 hex válido y determinista a partir de un seed pequeño. */
export function hex(seed: number): string {
  return seed.toString(16).padStart(64, "0").slice(0, 64);
}

export const SOURCE_PATH = "design-system/tokens/base.tokens.json";

/** Artifact real con bytes/hash/byteLength coherentes. */
export function artifactOf(format: BuildFormat, content: string): BuildArtifact {
  const bytes = new TextEncoder().encode(content);
  return createBuildArtifact({
    format,
    relativePath: artifactFilename(format),
    contentType: artifactContentType(format),
    bytes,
    contentHash: sha256Hex(bytes),
  });
}

/** Trío de artifacts válidos (css/json/typescript). */
export function validArtifacts(): readonly BuildArtifact[] {
  return [
    artifactOf("css", ":root {\n  --color-a: #111111;\n}\n"),
    artifactOf("json", '{\n  "formatVersion": "1.0.0"\n}\n'),
    artifactOf("typescript", "export const tokens = {} as const;\n"),
  ];
}

interface ManifestValueOptions {
  readonly hashes?: Partial<Record<BuildFormat, string>>;
  readonly byteLengths?: Partial<Record<BuildFormat, number>>;
}

/** Valor (objeto plano) de un build manifest válido para alimentar al clasificador de ownership. */
export function validManifestValue(options: ManifestValueOptions = {}): Record<string, unknown> {
  const hashes: Record<BuildFormat, string> = { css: hex(10), json: hex(11), typescript: hex(12), ...options.hashes };
  const lens: Record<BuildFormat, number> = { css: 100, json: 200, typescript: 300, ...options.byteLengths };
  return {
    formatVersion: "1.0.0",
    source: SOURCE_PATH,
    sourceHash: hex(1),
    artifacts: [
      { format: "css", relativePath: "tokens.css", contentHash: hashes.css, byteLength: lens.css },
      { format: "json", relativePath: "tokens.resolved.json", contentHash: hashes.json, byteLength: lens.json },
      { format: "typescript", relativePath: "tokens.ts", contentHash: hashes.typescript, byteLength: lens.typescript },
    ],
  };
}

/** Nodos de filesystem que coinciden exactamente con el manifest (artifacts intactos). */
export function nodesMatching(manifestValue: Record<string, unknown>): RequiredPathNode[] {
  const artifacts = manifestValue.artifacts as ReadonlyArray<{ relativePath: string; contentHash: string; byteLength: number }>;
  return artifacts.map((a) => ({ relativePath: a.relativePath, kind: "file", contentHash: a.contentHash, byteLength: a.byteLength }));
}

/** Confirma que ningún conflicto exponga rutas absolutas. */
export function noAbsolutePaths(messages: readonly string[]): boolean {
  return messages.every((m) => !m.includes("/Volumes/") && !/^\//.test(m) && !/[A-Za-z]:\\/.test(m));
}
