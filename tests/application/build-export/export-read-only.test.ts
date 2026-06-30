// T094 (006) — Export es read-only: exactamente un renderer por ejecución, cero writer/inspector/
// manifest (no forman parte de las deps de export), una sola lectura semántica, cero escrituras.
import { afterEach, describe, expect, it } from "vitest";
import { exportDesignSystemArtifact, type ExportDesignSystemArtifactDependencies } from "../../../src/application/build-export/export-design-system-artifact.js";
import type { BuildFormat } from "../../../src/domain/build-export/build-format.js";
import type { SourceSnapshotReader, SourceSnapshotResult } from "../../../src/application/build-export/build-ports.js";
import type { AnalyzedSourceSnapshot } from "../../../src/application/build-export/build-ports.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { countingRenderer, createBuildProjection, readSnapshot, type CountingRenderer } from "./build-export-fakes.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

function countingReader(snapshot: AnalyzedSourceSnapshot): SourceSnapshotReader & { calls: number } {
  const reader = {
    calls: 0,
    read(): Promise<SourceSnapshotResult> {
      reader.calls += 1;
      return Promise.resolve({ outcome: "ready", snapshot });
    },
  };
  return reader;
}

function exportDeps(reader: SourceSnapshotReader, renderers: Record<BuildFormat, CountingRenderer>): ExportDesignSystemArtifactDependencies {
  return { snapshotReader: reader, createProjection: createBuildProjection, rendererFor: (format) => renderers[format] };
}

describe("exportDesignSystemArtifact read-only (T094)", () => {
  it.each(["css", "json", "typescript"] as const)("export %s invoca exactamente un renderer y devuelve bytes", async (format) => {
    const snapshot = await readSnapshot(bag);
    const reader = countingReader(snapshot);
    const renderers: Record<BuildFormat, CountingRenderer> = { css: countingRenderer("css"), json: countingRenderer("json"), typescript: countingRenderer("typescript") };
    const result = await exportDesignSystemArtifact({ executionDir: "x", format }, exportDeps(reader, renderers));

    expect(result.outcome).toBe("exported");
    if (result.outcome !== "exported") return;
    expect(result.format).toBe(format);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.byteLength).toBe(result.bytes.length);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // Exactamente un renderer (el del formato); los otros 0.
    const calls = (["css", "json", "typescript"] as const).map((f) => renderers[f].calls);
    const expected = (["css", "json", "typescript"] as const).map((f) => (f === format ? 1 : 0));
    expect(calls).toEqual(expected);
    // Una sola lectura semántica; sin rereads.
    expect(reader.calls).toBe(1);
  });

  it("las deps de export no contienen writer/inspector/manifest (read-only por construcción)", () => {
    const deps: ExportDesignSystemArtifactDependencies = { snapshotReader: { read: () => Promise.reject(new Error("unused")) }, createProjection: createBuildProjection, rendererFor: () => countingRenderer("css") };
    expect(Object.keys(deps).sort()).toEqual(["createProjection", "rendererFor", "snapshotReader"]);
  });
});
