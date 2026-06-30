// T137 (006) — Idempotencia real: una segunda ejecución sin cambios resuelve `unchanged`/`wrote:false`
// SIN publicar (writer nunca invocado ⇒ 0 staging, 0 renames, 0 writes, 0 temporales, 0 bytes/mtime
// alterados). Verifica además que la decisión exige presencia + bytes en disco, no solo el hash del
// manifest.
import { afterEach, describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../../src/application/build-export/build-design-system.js";
import { decideUnchanged } from "../../../src/application/build-export/idempotency.js";
import type { BuildOutputInspection } from "../../../src/application/build-export/build-ports.js";
import type { BuildManifestV1 } from "../../../src/domain/build-export/build-manifest.js";
import { buildDeps, countingInspector, countingWriter, PUBLISHED_WRITE, readSnapshot } from "../../application/build-export/build-export-fakes.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

/** Construye la inspección de un build ya publicado y coherente a partir de la última petición del writer. */
function inspectionFromPublished(manifestBytes: Uint8Array, artifacts: readonly { relativePath: string; contentHash: string; byteLength: number }[]): BuildOutputInspection {
  const manifestValue = JSON.parse(new TextDecoder().decode(manifestBytes)) as BuildManifestV1;
  return {
    previousManifest: { state: "parsed", value: manifestValue },
    artifactNodes: artifacts.map((a) => ({ relativePath: a.relativePath, kind: "file" as const, contentHash: a.contentHash, byteLength: a.byteLength })),
  };
}

describe("build idempotency (T137)", () => {
  it("segunda ejecución sin cambios → unchanged sin invocar el writer", async () => {
    const snapshot = await readSnapshot(bag);

    // Primera ejecución: publica (output vacío).
    const firstWriter = countingWriter(PUBLISHED_WRITE);
    const first = await buildDesignSystem({ executionDir: "/x" }, buildDeps(snapshot, { writer: firstWriter }));
    expect(first.outcome).toBe("built");
    expect(firstWriter.calls).toBe(1);
    const request = firstWriter.lastRequest;
    expect(request).not.toBeNull();

    // Segunda ejecución: el output ya contiene exactamente esos artifacts + manifest.
    const inspection = inspectionFromPublished(request!.manifest.bytes, request!.artifacts);
    const secondWriter = countingWriter(PUBLISHED_WRITE);
    const second = await buildDesignSystem(
      { executionDir: "/x" },
      buildDeps(snapshot, { writer: secondWriter, outputInspector: countingInspector(inspection) }),
    );

    expect(second.outcome).toBe("unchanged");
    expect(second.wrote).toBe(false);
    // 0 publicaciones ⇒ 0 staging, 0 renames, 0 writes, 0 temporales, 0 bytes/mtime alterados.
    expect(secondWriter.calls).toBe(0);
  });

  it("manifest válido y hashes coincidentes pero artifacts ausentes en disco → NO unchanged", () => {
    const arts = [
      { format: "css" as const, relativePath: "tokens.css", contentHash: "b".repeat(64), byteLength: 10 },
      { format: "json" as const, relativePath: "tokens.resolved.json", contentHash: "c".repeat(64), byteLength: 20 },
      { format: "typescript" as const, relativePath: "tokens.ts", contentHash: "d".repeat(64), byteLength: 30 },
    ];
    const manifest: BuildManifestV1 = { formatVersion: "1.0.0", source: "design-system/tokens/base.tokens.json", sourceHash: "a".repeat(64), artifacts: arts };
    const decision = decideUnchanged({
      previousManifest: { state: "parsed", value: manifest },
      // El manifest declara los 3 artifacts, pero en disco están ausentes.
      artifactNodes: arts.map((a) => ({ relativePath: a.relativePath, kind: "absent" as const })),
      ownershipTrusted: true,
      sourceHash: "a".repeat(64),
      candidateArtifacts: arts.map((a) => ({ format: a.format, relativePath: a.relativePath, contentType: "text/plain", contentHash: a.contentHash, byteLength: a.byteLength })),
    });
    expect(decision.unchanged).toBe(false);
    expect(decision.reason).toBe("artifact-not-present");
  });

  it("ownership no confiable → NO unchanged aunque todo coincida", () => {
    const decision = decideUnchanged({
      previousManifest: { state: "parsed", value: { formatVersion: "1.0.0", source: "s", sourceHash: "a".repeat(64), artifacts: [] } },
      artifactNodes: [],
      ownershipTrusted: false,
      sourceHash: "a".repeat(64),
      candidateArtifacts: [],
    });
    expect(decision).toEqual({ unchanged: false, reason: "ownership-not-trusted" });
  });
});
