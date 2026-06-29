import { describe, expect, it } from "vitest";
import { buildPresetCandidateDocument } from "../../../src/application/presets/build-preset-candidate-document.js";
import { change, plan } from "./preset-candidate-test-utils.js";

describe("preset candidate insert ordering", () => {
  it("inserts top-level canonical categories deterministically even when changes arrive unsorted", () => {
    const result = buildPresetCandidateDocument({
      hostDocument: {},
      originalBytes: "{}\n",
      plan: plan([
        change("spacing.2", { category: "spacing", proposedToken: { $value: { value: 8, unit: "px" }, $type: "dimension" } }),
        change("color.gray.100", { category: "color", proposedToken: { $value: "#f5f5f5", $type: "color" } }),
      ]),
    });

    expect(result.status).toBe("built");
    expect(Object.keys(result.document as Record<string, unknown>)).toEqual(["color", "spacing"]);
    expect(result.bytes).toBe(buildPresetCandidateDocument({ hostDocument: {}, originalBytes: "{}\n", plan: plan([
      change("spacing.2", { category: "spacing", proposedToken: { $value: { value: 8, unit: "px" }, $type: "dimension" } }),
      change("color.gray.100", { category: "color", proposedToken: { $value: "#f5f5f5", $type: "color" } }),
    ]) }).bytes);
  });

  it("creates intermediate groups before tokens and preserves existing sibling order where possible", () => {
    const host = { color: { existing: { $value: "#000", $type: "color" } } };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "original",
      plan: plan([
        change("color.gray", { nodeKind: "group", proposedToken: {} }),
        change("color.gray.100", { proposedToken: { $value: "#f5f5f5", $type: "color" } }),
        change("color.gray.200", { proposedToken: { $value: "#eeeeee", $type: "color" } }),
      ]),
    });

    const color = (result.document as { color: Record<string, unknown> }).color;
    expect(Object.keys(color)).toEqual(["existing", "gray"]);
    expect(Object.keys(color.gray as Record<string, unknown>)).toEqual(["100", "200"]);
  });
});
