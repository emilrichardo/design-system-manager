import { describe, expect, it } from "vitest";
import { buildPresetCandidateDocument } from "../../../src/application/presets/build-preset-candidate-document.js";
import { presetConflict } from "../../../src/domain/presets/preset-conflict.js";
import { change, plan } from "../../unit/presets/preset-candidate-test-utils.js";

const originalBytes = "{\n        \"color\": { \"brand\": { \"$value\": \"#123456\", \"$type\": \"color\" } }\n}\n";
const host = { color: { brand: { $value: "#123456", $type: "color" } } };

describe("preset candidate no-write byte identity", () => {
  it("unchanged plans keep original bytes", () => {
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes,
      plan: plan([change("color.brand", { operation: "unchanged", proposedToken: null })]),
    });

    expect(result.status).toBe("unchanged");
    expect(result.bytes).toBe(originalBytes);
    expect(result.appliedChanges).toBe(0);
  });

  it("blocking conflicts keep original bytes", () => {
    const conflict = presetConflict("preset-value-differs", "color.brand");
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes,
      plan: plan([change("color.brand", { operation: "conflict", conflict, blocksWrite: true, proposedToken: null })]),
    });

    expect(result.status).toBe("blocked");
    expect(result.bytes).toBe(originalBytes);
  });

  it("invalid host/change paths keep original bytes for later read/write-error projections", () => {
    const invalidHost = buildPresetCandidateDocument({ hostDocument: null, originalBytes, plan: plan([]) });
    const invalidChange = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes,
      plan: plan([change("color.new", { proposedToken: null })]),
    });

    expect(invalidHost.bytes).toBe(originalBytes);
    expect(invalidChange.bytes).toBe(originalBytes);
  });
});
