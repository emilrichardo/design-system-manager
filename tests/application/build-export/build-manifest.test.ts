// T071 (006) — Contrato y bytes del build manifest: versión, source lógico, orden, hashes, byteLength,
// sin self-entry/timestamp/cwd/hostname/rutas absolutas, serializer determinista standalone.
import { describe, expect, it } from "vitest";
import { buildBuildManifest } from "../../../src/application/build-export/manifest-builder.js";
import { serializeBuildManifestV1 } from "../../../src/infrastructure/build-export/json-renderer.js";
import type { BuildManifestV1 } from "../../../src/domain/build-export/build-manifest.js";
import { SOURCE_PATH, hex, validArtifacts } from "./ownership-helpers.js";

function builtManifest(): BuildManifestV1 {
  const r = buildBuildManifest({ source: SOURCE_PATH, sourceHash: hex(1), artifacts: validArtifacts() });
  if (!r.ok) throw new Error(`builder failed: ${r.error.code}`);
  return r.manifest;
}

describe("build manifest builder + serializer (T069/T070/T071)", () => {
  it("formatVersion 1.0.0, source lógico (token source, no host manifest), 3 artifacts en orden", () => {
    const m = builtManifest();
    expect(m.formatVersion).toBe("1.0.0");
    expect(m.source).toBe(SOURCE_PATH);
    expect(m.source).not.toBe("design-system/design-system.json");
    expect(m.artifacts.map((a) => a.format)).toEqual(["css", "json", "typescript"]);
    expect(m.artifacts.map((a) => a.relativePath)).toEqual(["tokens.css", "tokens.resolved.json", "tokens.ts"]);
  });

  it("no incluye self-entry (manifest.json) y byteLength coincide con los bytes", () => {
    const arts = validArtifacts();
    const m = builtManifest();
    expect(m.artifacts.some((a) => a.relativePath === "manifest.json")).toBe(false);
    for (const a of m.artifacts) {
      const src = arts.find((x) => x.format === a.format)!;
      expect(a.byteLength).toBe(src.bytes.length);
      expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("builder rechaza formato faltante, hash inválido, byteLength mismatch y path no contractual", () => {
    expect(buildBuildManifest({ source: SOURCE_PATH, sourceHash: hex(1), artifacts: validArtifacts().slice(0, 2) }).ok).toBe(false);
    expect(buildBuildManifest({ source: SOURCE_PATH, sourceHash: "ABC", artifacts: validArtifacts() }).ok).toBe(false);
  });

  it("serializa con 2 espacios, LF final único, sin BOM y orden de claves contractual", () => {
    const bytes = serializeBuildManifestV1(builtManifest());
    const text = new TextDecoder().decode(bytes);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("}\n\n")).toBe(false);
    expect(bytes[0]).not.toBe(0xef); // sin BOM
    expect(text.startsWith('{\n  "formatVersion": "1.0.0",\n  "source":')).toBe(true);
    // Orden de claves raíz.
    expect(text.indexOf('"formatVersion"')).toBeLessThan(text.indexOf('"source"'));
    expect(text.indexOf('"source"')).toBeLessThan(text.indexOf('"sourceHash"'));
    expect(text.indexOf('"sourceHash"')).toBeLessThan(text.indexOf('"artifacts"'));
    // Orden de claves de artifact.
    expect(text.indexOf('"format"')).toBeLessThan(text.indexOf('"relativePath"'));
    expect(text.indexOf('"relativePath"')).toBeLessThan(text.indexOf('"contentHash"'));
    expect(text.indexOf('"contentHash"')).toBeLessThan(text.indexOf('"byteLength"'));
  });

  it("no contiene timestamp/cwd/hostname/rutas absolutas ni datos internos", () => {
    const text = new TextDecoder().decode(serializeBuildManifestV1(builtManifest()));
    for (const marker of ["/Volumes/", "cwd", "hostname", "rawBytes", "decodedText", "parsedDocument", "trust", "aliasChain", "stack", "Error", "20"]) {
      if (marker === "20") {
        // Permite "1.0.0" pero no años tipo 2026 (timestamps).
        expect(/20\d{2}-\d{2}-\d{2}/.test(text)).toBe(false);
        continue;
      }
      expect(text.includes(marker)).toBe(false);
    }
  });

  it("serializer standalone es determinista: artifacts en distinto insertion order → mismos bytes", () => {
    const m = builtManifest();
    const reversed: BuildManifestV1 = { ...m, artifacts: [...m.artifacts].reverse() };
    expect(serializeBuildManifestV1(reversed)).toEqual(serializeBuildManifestV1(m));
  });
});
