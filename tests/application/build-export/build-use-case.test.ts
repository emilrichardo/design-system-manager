// T093 (006) — Caso de uso build: éxito (1 lectura, 1 proyección, 3 renderers, manifest, ownership,
// writer 1, built/wrote:true); fallo de renderer bloquea antes de escribir; conflicto de ownership;
// unchanged; write-error y verification-error propagados de forma segura.
import { afterEach, describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../../src/application/build-export/build-design-system.js";
import type { ArtifactRenderResult } from "../../../src/application/build-export/build-ports.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import {
  EMPTY_INSPECTION,
  buildBuildManifest,
  buildDeps,
  countingInspector,
  countingRenderer,
  countingWriter,
  createBuildProjection,
  readSnapshot,
  serializeBuildManifestV1,
  PUBLISHED_WRITE,
} from "./build-export-fakes.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("buildDesignSystem (T091)", () => {
  it("éxito: una proyección compartida por los 3 renderers, writer 1 vez, built/wrote:true", async () => {
    const snapshot = await readSnapshot(bag);
    let projectionCalls = 0;
    const renderers = [countingRenderer("css"), countingRenderer("json"), countingRenderer("typescript")];
    const writer = countingWriter(PUBLISHED_WRITE);
    const inspector = countingInspector(EMPTY_INSPECTION);
    const result = await buildDesignSystem(
      { executionDir: "x" },
      buildDeps(snapshot, {
        createProjection: (s) => {
          projectionCalls += 1;
          return createBuildProjection(s);
        },
        renderers,
        writer,
        outputInspector: inspector,
      }),
    );

    expect(result.outcome).toBe("built");
    expect(result.wrote).toBe(true);
    expect(projectionCalls).toBe(1);
    expect(renderers.map((r) => r.calls)).toEqual([1, 1, 1]);
    // Misma instancia de proyección a los 3 renderers.
    expect(renderers[0]!.lastSet).toBe(renderers[1]!.lastSet);
    expect(renderers[1]!.lastSet).toBe(renderers[2]!.lastSet);
    expect(writer.calls).toBe(1);
    expect(writer.lastRequest?.artifacts.map((a) => a.relativePath)).toEqual(["tokens.css", "tokens.resolved.json", "tokens.ts"]);
    expect(result.artifacts.map((a) => a.format)).toEqual(["css", "json", "typescript"]);
    expect(result.manifest?.relativePath).toBe("manifest.json");
    expect(result.outputDirectory).toBe("design-system/build");
  });

  it("fallo de renderer bloquea antes de manifest/ownership/writer (fail-fast)", async () => {
    const snapshot = await readSnapshot(bag);
    const fail = (): ArtifactRenderResult => ({ outcome: "unsupported-value", errors: [{ format: "css", code: "css-type-unsupported", tokenPath: "x.y", type: "shadow", message: "no" }] });
    const renderers = [countingRenderer("css", fail), countingRenderer("json"), countingRenderer("typescript")];
    const writer = countingWriter(PUBLISHED_WRITE);
    const inspector = countingInspector(EMPTY_INSPECTION);
    const result = await buildDesignSystem({ executionDir: "x" }, buildDeps(snapshot, { renderers, writer, outputInspector: inspector }));

    expect(result.outcome).toBe("unsupported-value");
    expect(result.wrote).toBe(false);
    expect(result.artifacts).toEqual([]);
    expect(writer.calls).toBe(0);
    expect(inspector.calls).toBe(0);
    expect(renderers[1]!.calls).toBe(0); // fail-fast: json no se renderiza
    expect(renderers[2]!.calls).toBe(0);
  });

  it("conflicto de ownership → conflict, writer 0", async () => {
    const snapshot = await readSnapshot(bag);
    const writer = countingWriter(PUBLISHED_WRITE);
    const inspector = countingInspector({
      previousManifest: { state: "absent" },
      artifactNodes: [
        { relativePath: "tokens.css", kind: "file", contentHash: "a".repeat(64), byteLength: 9 },
        { relativePath: "tokens.resolved.json", kind: "absent" },
        { relativePath: "tokens.ts", kind: "absent" },
      ],
    });
    const result = await buildDesignSystem({ executionDir: "x" }, buildDeps(snapshot, { writer, outputInspector: inspector }));
    expect(result.outcome).toBe("conflict");
    expect(result.wrote).toBe(false);
    expect(writer.calls).toBe(0);
    expect(result.conflict?.code).toBe("required-path-owned-by-unknown");
  });

  it("unchanged cuando el manifest previo coincide → writer 0", async () => {
    const snapshot = await readSnapshot(bag);
    const set = createBuildProjection(snapshot);
    if (!set.ok) throw new Error("projection");
    const renderers = [countingRenderer("css"), countingRenderer("json"), countingRenderer("typescript")];
    const artifacts = renderers.map((r) => {
      const out = r.render(set.set);
      if (out.outcome !== "rendered") throw new Error("render");
      return out.artifact;
    });
    const manifest = buildBuildManifest({ source: snapshot.logicalSourcePath, sourceHash: snapshot.sourceHash, artifacts });
    if (!manifest.ok) throw new Error("manifest");
    const value = JSON.parse(new TextDecoder().decode(serializeBuildManifestV1(manifest.manifest))) as Record<string, unknown>;
    const nodes = artifacts.map((a) => ({ relativePath: a.relativePath, kind: "file" as const, contentHash: a.contentHash, byteLength: a.byteLength }));

    const writer = countingWriter(PUBLISHED_WRITE);
    const result = await buildDesignSystem(
      { executionDir: "x" },
      buildDeps(snapshot, { writer, outputInspector: countingInspector({ previousManifest: { state: "parsed", value }, artifactNodes: nodes }) }),
    );
    expect(result.outcome).toBe("unchanged");
    expect(result.wrote).toBe(false);
    expect(writer.calls).toBe(0);
  });

  it("write-error y verification-error del writer se propagan con recovery seguro", async () => {
    const snapshot = await readSnapshot(bag);
    const writeError = await buildDesignSystem(
      { executionDir: "x" },
      buildDeps(snapshot, {
        writer: countingWriter({ outcome: "write-error", wrote: false, outputAvailable: true, backupRelativePath: null, recoveryRequired: false, verification: null, conflicts: [], error: { code: "write-failed", message: "io" } }),
      }),
    );
    expect(writeError.outcome).toBe("write-error");
    expect(writeError.wrote).toBe(false);
    expect(writeError.error?.code).toBe("write-failed");

    const verifyError = await buildDesignSystem(
      { executionDir: "x" },
      buildDeps(snapshot, {
        writer: countingWriter({ outcome: "verification-error", wrote: true, outputAvailable: true, backupRelativePath: ".neuraz-build-backup", recoveryRequired: true, verification: { status: "failed", checks: [], artifacts: [] }, conflicts: [], error: { code: "verify-failed", message: "bad" } }),
      }),
    );
    expect(verifyError.outcome).toBe("verification-error");
    expect(verifyError.wrote).toBe(true);
    expect(verifyError.recoveryRequired).toBe(true);
    expect(verifyError.backupRelativePath).toBe(".neuraz-build-backup");
  });
});
