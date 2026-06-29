import { afterEach, describe, expect, it } from "vitest";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { renderResolvedTokensArtifact } from "../../../src/infrastructure/build-export/json-renderer.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const bag: TmpProject[] = [];

afterEach(async () => {
  await Promise.all(bag.splice(0).map((project) => project.cleanup()));
});

function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, keys);
    return keys;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      keys.push(key);
      collectKeys(entry, keys);
    }
  }
  return keys;
}

describe("resolved tokens artifact no-leak (T059)", () => {
  it("no expone bytes crudos, decoded/parsed source, sourceValue, trust, aliasChain, extensions ni paths absolutos", async () => {
    const dir = await makeProject(bag, {
      tokens: {
        color: {
          base: {
            $type: "color",
            $value: COLOR,
            $extensions: {
              private: {
                rawBytes: "RAW-BYTES-MARKER",
                decodedText: "DECODED-SOURCE-MARKER",
                parsedDocument: "PARSED-SOURCE-MARKER",
                sourceValue: "SOURCE-VALUE-MARKER",
                trust: "TRUST-MARKER",
                compatibility: "COMPATIBILITY-MARKER",
                aliasChain: "ALIAS-CHAIN-MARKER",
                stack: "STACK-MARKER",
                absPath: "ABS-PATH-MARKER",
                extensionMarker: "EXTENSION-MARKER",
              },
            },
          },
          alias: {
            $type: "color",
            $value: "{color.base}",
            $extensions: {
              private: {
                secondAliasGraph: "SECOND-ALIAS-GRAPH-MARKER",
                secondAnalyzer: "SECOND-ANALYZER-MARKER",
              },
            },
          },
        },
      },
    });

    const snapshotResult = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(snapshotResult.outcome).toBe("ready");
    if (snapshotResult.outcome !== "ready") return;

    const projectionResult = createBuildProjection(snapshotResult.snapshot);
    expect(projectionResult.ok).toBe(true);
    if (!projectionResult.ok) return;

    const renderResult = renderResolvedTokensArtifact(projectionResult.set);
    expect(renderResult.outcome).toBe("rendered");
    if (renderResult.outcome !== "rendered") return;

    const text = new TextDecoder().decode(renderResult.artifact.bytes);
    const parsed = JSON.parse(text) as unknown;
    const keys = collectKeys(parsed);

    expect(Object.keys(parsed as Record<string, unknown>)).toEqual(["formatVersion", "source", "tokens"]);
    expect(Object.keys((parsed as { source: Record<string, unknown> }).source)).toEqual(["path", "hash"]);
    expect(keys).not.toContain("rawBytes");
    expect(keys).not.toContain("decodedText");
    expect(keys).not.toContain("parsedDocument");
    expect(keys).not.toContain("sourceValue");
    expect(keys).not.toContain("trust");
    expect(keys).not.toContain("compatibility");
    expect(keys).not.toContain("aliasChain");
    expect(keys).not.toContain("$extensions");
    expect(keys).not.toContain("stack");

    for (const marker of [
      "RAW-BYTES-MARKER",
      "DECODED-SOURCE-MARKER",
      "PARSED-SOURCE-MARKER",
      "SOURCE-VALUE-MARKER",
      "TRUST-MARKER",
      "COMPATIBILITY-MARKER",
      "ALIAS-CHAIN-MARKER",
      "STACK-MARKER",
      "ABS-PATH-MARKER",
      "EXTENSION-MARKER",
      "SECOND-ALIAS-GRAPH-MARKER",
      "SECOND-ANALYZER-MARKER",
    ]) {
      expect(text).not.toContain(marker);
    }

    expect(text).not.toContain(dir);
    expect(text).not.toContain("design-system/build/tokens.resolved.json");
    expect(text).toContain('"aliasOf": "color.base"');
  });
});
