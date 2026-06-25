import { describe, expect, it } from "vitest";
import { serializeJson } from "../../src/infrastructure/serialization/json.js";
import { prepareFiles } from "../../src/infrastructure/serialization/prepare-files.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { validIdentity, validTokens } from "../fixtures/documents.js";

describe("serializeJson (T035)", () => {
  it("produce JSON con 2 espacios y newline final", () => {
    const out = serializeJson({ a: 1, b: { c: 2 } });
    expect(out.endsWith("\n")).toBe(true);
    expect(out).toContain('\n  "a": 1');
    expect(out).toContain('\n    "c": 2');
  });

  it("es determinista: serialize(x) === serialize(x)", () => {
    expect(serializeJson(validTokens)).toBe(serializeJson(validTokens));
  });

  it("preserva Unicode y reconstruye el documento con JSON.parse", () => {
    const doc = { name: "Diseño Münster — café ☕" };
    const s = serializeJson(doc);
    expect(JSON.parse(s)).toEqual(doc);
  });

  it("no muta la entrada", () => {
    const doc = { a: [1, 2, 3] };
    const before = JSON.stringify(doc);
    serializeJson(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe("prepareFiles (T035)", () => {
  it("prepara exactamente los 3 archivos en orden determinista, ya serializados", () => {
    const files = prepareFiles(validIdentity);
    expect(files.map((f) => f.relativePath)).toEqual([
      MANAGED_FILES.config,
      MANAGED_FILES.manifest,
      MANAGED_FILES.tokens,
    ]);
    for (const f of files) {
      expect(f.content.endsWith("\n")).toBe(true);
      expect(() => JSON.parse(f.content)).not.toThrow();
    }
  });

  it("el documento DTCG preparado conserva el objeto sRGB y el alias", () => {
    const tokens = prepareFiles(validIdentity).find((f) => f.relativePath === MANAGED_FILES.tokens)!;
    const parsed = JSON.parse(tokens.content);
    expect(parsed.color.base["blue-500"].$value.colorSpace).toBe("srgb");
    expect(parsed.color.brand.primary.$value).toBe("{color.base.blue-500}");
  });
});
