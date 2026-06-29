import { describe, expect, it } from "vitest";
import { buildPresetCandidateDocument } from "../../../src/application/presets/build-preset-candidate-document.js";
import { change, plan } from "../../unit/presets/preset-candidate-test-utils.js";

describe("preset candidate preservation integration", () => {
  it("successful candidate preserves semantics but may produce approved pretty JSON bytes", () => {
    const originalBytes = "{\"color\":{\"brand\":{\"$value\":\"#123456\",\"$type\":\"color\",\"custom\":true}}}\n";
    const host = { color: { brand: { $value: "#123456", $type: "color", custom: true } } };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes,
      plan: plan([change("color.new", { proposedToken: { $value: "#fff", $type: "color" } })]),
    });

    expect(result.status).toBe("built");
    expect(result.bytes).not.toBe(originalBytes);
    expect(JSON.parse(result.bytes)).toEqual({
      color: {
        brand: { $value: "#123456", $type: "color", custom: true },
        new: { $value: "#fff", $type: "color" },
      },
    });
  });

  it("no-write paths preserve byte identity instead of reserializing", () => {
    const originalBytes = "{\"color\":{\"brand\":{\"$value\":\"#123456\",\"$type\":\"color\"}}}\n";
    const host = { color: { brand: { $value: "#123456", $type: "color" } } };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes,
      plan: plan([change("color.brand", { operation: "unchanged", proposedToken: null })]),
    });

    expect(result.status).toBe("unchanged");
    expect(result.bytes).toBe(originalBytes);
  });
});
