// T095 (006) — Outcomes de export: exported, invalid-design-system, unsupported-value, not-found, read-error.
import { afterEach, describe, expect, it } from "vitest";
import { exportDesignSystemArtifact, type ExportDesignSystemArtifactDependencies } from "../../../src/application/build-export/export-design-system-artifact.js";
import type { ArtifactRenderResult, SourceSnapshotResult } from "../../../src/application/build-export/build-ports.js";
import { COLOR } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { countingRenderer, createBuildProjection, fakeSnapshotReader, readSnapshot } from "./build-export-fakes.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

function deps(snapshotResult: SourceSnapshotResult, render?: () => ArtifactRenderResult): ExportDesignSystemArtifactDependencies {
  return { snapshotReader: fakeSnapshotReader(snapshotResult), createProjection: createBuildProjection, rendererFor: (format) => countingRenderer(format, render) };
}

describe("export outcomes (T095)", () => {
  it("exported con fuente válida", async () => {
    const snapshot = await readSnapshot(bag, { color: { base: { $type: "color", $value: COLOR } } });
    const r = await exportDesignSystemArtifact({ executionDir: "x", format: "css" }, deps({ outcome: "ready", snapshot }));
    expect(r.outcome).toBe("exported");
  });

  it("invalid-design-system cuando la proyección rechaza (alias roto)", async () => {
    const snapshot = await readSnapshot(bag, { color: { base: { $type: "color", $value: COLOR }, x: { $value: "{color.nope}" } } });
    const r = await exportDesignSystemArtifact({ executionDir: "x", format: "json" }, deps({ outcome: "ready", snapshot }));
    expect(r.outcome).toBe("invalid-design-system");
  });

  it("unsupported-value cuando el renderer no soporta el valor", async () => {
    const snapshot = await readSnapshot(bag);
    const r = await exportDesignSystemArtifact(
      { executionDir: "x", format: "css" },
      deps({ outcome: "ready", snapshot }, () => ({ outcome: "unsupported-value", errors: [{ format: "css", code: "css-type-unsupported", tokenPath: "x.y", type: "shadow", message: "no" }] })),
    );
    expect(r.outcome).toBe("unsupported-value");
    if (r.outcome === "exported") return;
    expect(r.error?.code).toBe("css-type-unsupported");
  });

  it("not-found cuando el snapshot no encuentra el Design System", async () => {
    const r = await exportDesignSystemArtifact({ executionDir: "x", format: "css" }, deps({ outcome: "not-found", snapshot: null, reason: "no DS" }));
    expect(r.outcome).toBe("not-found");
  });

  it("read-error cuando el snapshot falla la lectura", async () => {
    const r = await exportDesignSystemArtifact({ executionDir: "x", format: "typescript" }, deps({ outcome: "read-error", snapshot: null, reason: "utf8" }));
    expect(r.outcome).toBe("read-error");
  });
});
