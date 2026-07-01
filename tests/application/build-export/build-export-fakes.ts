// Helpers de tests del Checkpoint G: adaptadores de renderers reales a `ArtifactRenderer`, fakes con
// contadores para writer/inspector y un lector de snapshot real sobre un proyecto temporal. NO es test.
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { renderCssArtifact } from "../../../src/infrastructure/build-export/css-renderer.js";
import { renderResolvedTokensArtifact } from "../../../src/infrastructure/build-export/json-renderer.js";
import { renderTypeScriptTokensArtifact } from "../../../src/infrastructure/build-export/ts-renderer.js";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { buildBuildManifest } from "../../../src/application/build-export/manifest-builder.js";
import { serializeBuildManifestV1 } from "../../../src/infrastructure/build-export/json-renderer.js";
import { classifyBuildOwnership } from "../../../src/application/build-export/ownership.js";
import type { BrandSourceSnapshot } from "../../../src/domain/brand/index.js";
import type {
  AnalyzedSourceSnapshot,
  ArtifactRenderResult,
  ArtifactRenderer,
  ArtifactSetWriteRequest,
  ArtifactSetWriteResult,
  ArtifactSetWriter,
  BuildOutputInspection,
  BuildOutputInspector,
  SourceSnapshotReader,
  SourceSnapshotResult,
} from "../../../src/application/build-export/build-ports.js";
import type { BuildFormat } from "../../../src/domain/build-export/build-format.js";
import type { NormalizedTokenSet } from "../../../src/domain/build-export/normalized-token.js";
import type { BuildDesignSystemDependencies } from "../../../src/application/build-export/build-design-system.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

export { createBuildProjection, buildBuildManifest, serializeBuildManifestV1, sha256Hex, classifyBuildOwnership };

const REAL_RENDERERS: Record<BuildFormat, (set: NormalizedTokenSet) => ArtifactRenderResult> = {
  css: (set) => normalize(renderCssArtifact(set)),
  json: (set) => normalize(renderResolvedTokensArtifact(set)),
  typescript: (set) => normalize(renderTypeScriptTokensArtifact(set)),
};

function normalize(result: { outcome: "rendered"; artifact: import("../../../src/domain/build-export/artifact.js").BuildArtifact } | { outcome: "unsupported-value"; errors: readonly { format: BuildFormat; code: string; tokenPath: string | null; message: string; type?: string | null }[] }): ArtifactRenderResult {
  if (result.outcome === "rendered") return { outcome: "rendered", artifact: result.artifact };
  return {
    outcome: "unsupported-value",
    errors: result.errors.map((e) => ({ format: e.format, code: e.code, tokenPath: e.tokenPath, type: e.type ?? null, message: e.message })),
  };
}

export interface CountingRenderer extends ArtifactRenderer {
  calls: number;
  lastSet: NormalizedTokenSet | null;
}

/** Renderer con contador; por defecto usa el renderer real del formato, o un override. */
export function countingRenderer(format: BuildFormat, override?: (set: NormalizedTokenSet) => ArtifactRenderResult): CountingRenderer {
  const renderer: CountingRenderer = {
    format,
    calls: 0,
    lastSet: null,
    render(set: NormalizedTokenSet): ArtifactRenderResult {
      renderer.calls += 1;
      renderer.lastSet = set;
      return (override ?? REAL_RENDERERS[format])(set);
    },
  };
  return renderer;
}

export interface CountingWriter extends ArtifactSetWriter {
  calls: number;
  lastRequest: ArtifactSetWriteRequest | null;
}

export function countingWriter(result: ArtifactSetWriteResult): CountingWriter {
  const writer: CountingWriter = {
    calls: 0,
    lastRequest: null,
    write(request: ArtifactSetWriteRequest): Promise<ArtifactSetWriteResult> {
      writer.calls += 1;
      writer.lastRequest = request;
      return Promise.resolve(result);
    },
  };
  return writer;
}

export interface CountingInspector extends BuildOutputInspector {
  calls: number;
}

export function countingInspector(inspection: BuildOutputInspection): CountingInspector {
  const inspector: CountingInspector = {
    calls: 0,
    inspect(): Promise<BuildOutputInspection> {
      inspector.calls += 1;
      return Promise.resolve(inspection);
    },
  };
  return inspector;
}

/** Inspección de "primer build" (output vacío). */
export const EMPTY_INSPECTION: BuildOutputInspection = {
  previousManifest: { state: "absent" },
  artifactNodes: [
    { relativePath: "tokens.css", kind: "absent" },
    { relativePath: "tokens.resolved.json", kind: "absent" },
    { relativePath: "tokens.ts", kind: "absent" },
    { relativePath: "brand.json", kind: "absent" },
  ],
};

export const ABSENT_BRAND_SOURCE: BrandSourceSnapshot = {
  root: "/x",
  status: "absent",
  documents: {
    brandProfile: { relativePath: "design-system/brand/brand.json", state: "absent", value: null, contentHash: null, byteLength: null },
    voice: { relativePath: "design-system/brand/voice-and-tone.json", state: "absent", value: null, contentHash: null, byteLength: null },
    visualLanguage: { relativePath: "design-system/brand/visual-language.json", state: "absent", value: null, contentHash: null, byteLength: null },
    usageGuidelines: { relativePath: "design-system/brand/usage-guidelines.json", state: "absent", value: null, contentHash: null, byteLength: null },
  },
};

export const PUBLISHED_WRITE: ArtifactSetWriteResult = {
  outcome: "published",
  wrote: true,
  outputAvailable: true,
  backupRelativePath: null,
  recoveryRequired: false,
  verification: { status: "passed", checks: [], artifacts: [] },
  conflicts: [],
  error: null,
};

/** Lee un snapshot real desde un proyecto temporal (registra cleanup en `bag`). */
export async function readSnapshot(bag: TmpProject[], tokens?: Record<string, unknown>): Promise<AnalyzedSourceSnapshot> {
  const dir = await makeProject(bag, tokens ? { tokens } : {});
  const result = await createBuildSnapshotReader().read({ executionDir: dir });
  if (result.outcome !== "ready") throw new Error(`snapshot ${result.outcome}`);
  return result.snapshot;
}

/** SourceSnapshotReader fake que devuelve un snapshot ya leído (o un fallo). */
export function fakeSnapshotReader(result: SourceSnapshotResult): SourceSnapshotReader {
  return { read: () => Promise.resolve(result) };
}

/** Dependencias reales por defecto (renderers reales con contadores, writer/inspector fake). */
export function buildDeps(
  snapshot: AnalyzedSourceSnapshot,
  overrides: Partial<BuildDesignSystemDependencies> & { renderers?: readonly ArtifactRenderer[] } = {},
): BuildDesignSystemDependencies {
  return {
    snapshotReader: fakeSnapshotReader({ outcome: "ready", snapshot }),
    readBrandSource: async () => ABSENT_BRAND_SOURCE,
    createProjection: createBuildProjection,
    renderers: overrides.renderers ?? [countingRenderer("css"), countingRenderer("json"), countingRenderer("typescript")],
    buildManifest: buildBuildManifest,
    serializeManifest: serializeBuildManifestV1,
    hashBytes: sha256Hex,
    outputInspector: countingInspector(EMPTY_INSPECTION),
    classifyOwnership: classifyBuildOwnership,
    writer: countingWriter(PUBLISHED_WRITE),
    ...overrides,
  };
}
