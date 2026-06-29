import { describe, expect, it } from "vitest";
import { buildPresetCandidateDocument } from "../../../src/application/presets/build-preset-candidate-document.js";
import { change, plan } from "./preset-candidate-test-utils.js";

describe("preset candidate safety", () => {
  it("never replaces existing value/type/alias/foundation metadata through a create collision", () => {
    const host = {
      color: {
        brand: {
          $value: "#123456",
          $type: "color",
          $extensions: { neuraz: { foundation: { level: "semantic" } }, unknown: true },
        },
      },
    };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "original",
      plan: plan([
        change("color.brand", {
          proposedToken: {
            $value: "#ffffff",
            $type: "color",
            $extensions: { neuraz: { foundation: { level: "primitive" } } },
          },
        }),
      ]),
    });

    expect(result.status).toBe("built");
    expect(result.document).toEqual(host);
    expect(result.appliedChanges).toBe(0);
  });

  it("rejects invalid destructive updates and returns original bytes", () => {
    const host = { color: { brand: { $value: "#123456", $type: "color" } } };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "{\"color\":true}\n",
      plan: plan([
        change("color.brand", {
          operation: "update",
          proposedToken: { $value: "#ffffff" },
        }),
      ]),
    });

    expect(result.status).toBe("invalid-change");
    expect(result.bytes).toBe("{\"color\":true}\n");
    expect(result.document).toEqual(host);
  });

  it("does not delete, write config or manifest documents, or wholesale replace extensions", () => {
    const host = {
      color: { keep: { $value: "#000", $type: "color" } },
      "neuraz-ds.config.json": { accidental: true },
      "design-system": { "design-system.json": { accidental: true } },
    };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "original",
      plan: plan([change("color.new", { proposedToken: { $value: "#fff", $type: "color" } })]),
    });

    expect(result.document).toMatchObject({
      color: { keep: { $value: "#000", $type: "color" }, new: { $value: "#fff", $type: "color" } },
      "neuraz-ds.config.json": { accidental: true },
      "design-system": { "design-system.json": { accidental: true } },
    });
    expect(JSON.stringify(result.document)).not.toContain('"delete"');
  });
});
