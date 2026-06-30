// T025 (007) — AssetJsonEnvelopeV1: parseable, formatVersion, command, paths lógicos, sin rutas
// absolutas; serializer determinista (2 espacios, LF final); independiente del envelope de 003.
import { describe, expect, it } from "vitest";
import { mapInspectResultToJsonEnvelope, mapListResultToJsonEnvelope } from "../../../src/application/assets/json/map-assets.js";
import { serializeAssetJsonV1 } from "../../../src/infrastructure/reporter/assets-json-serializer.js";
import { UNSPECIFIED_LICENSE, type AssetRecord } from "../../../src/domain/assets/asset-record.js";
import type { AssetInspectResult, AssetListResult } from "../../../src/application/assets/asset-ports.js";

const record: AssetRecord = {
  logicalPath: "images/hero.png",
  kind: "image",
  mimeType: "image/png",
  byteLength: 12,
  contentHash: "c".repeat(64),
  dimensions: { width: 8, height: 4, unit: "px" },
  provenance: { kind: "local-import", sourceRef: "in/hero.png" },
  license: UNSPECIFIED_LICENSE,
};
const listResult: AssetListResult = {
  outcome: "listed",
  assets: [record],
  summary: { totalAssets: 1, byKind: { font: 0, logo: 0, svg: 0, icon: 0, image: 1 }, totalByteLength: 12 },
  conflicts: [],
  error: null,
};
const inspectResult: AssetInspectResult = {
  outcome: "inspected",
  inspection: { record, pathState: "file", issues: [] },
  conflicts: [],
  error: null,
};

describe("AssetJsonEnvelopeV1 (T025)", () => {
  it("list: envelope con formatVersion/command y paths lógicos", () => {
    const env = mapListResultToJsonEnvelope(listResult);
    expect(env.formatVersion).toBe("1.0.0");
    expect(env.command).toBe("asset-list");
    expect(env.outcome).toBe("listed");
    const text = serializeAssetJsonV1(env);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//); // sin rutas absolutas
    expect(text).toContain('"logicalPath": "images/hero.png"');
  });

  it("inspect: envelope con record", () => {
    const env = mapInspectResultToJsonEnvelope(inspectResult);
    expect(env.command).toBe("asset-inspect");
    expect((env.result as { record: { mimeType: string } }).record.mimeType).toBe("image/png");
  });

  it("error outcome → result null + error", () => {
    const env = mapListResultToJsonEnvelope({ outcome: "invalid-asset-store", assets: [], summary: listResult.summary, conflicts: [], error: { code: "invalid-asset-store", message: "bad", path: null, details: null } });
    expect(env.result).toBeNull();
    expect(env.error?.code).toBe("invalid-asset-store");
  });

  it("serializer determinista: 2 espacios, LF final único", () => {
    const text = serializeAssetJsonV1(mapListResultToJsonEnvelope(listResult));
    expect(text).toContain('\n  "');
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("}\n\n")).toBe(false);
    expect(serializeAssetJsonV1(mapListResultToJsonEnvelope(listResult))).toBe(text);
  });
});
