import { describe, expect, it } from "vitest";
import { buildPresetCandidateDocument } from "../../../src/application/presets/build-preset-candidate-document.js";
import { change, orderedPlan } from "./preset-candidate-test-utils.js";

describe("preset candidate document preservation", () => {
  it("creates authorized tokens while preserving existing tokens, groups, unrelated categories and unknown metadata", () => {
    const host = {
      $extensions: { "x-host": { owner: "team" } },
      color: {
        $extensions: { "x-color": true },
        brand: {
          $value: "#123456",
          $type: "color",
          $extensions: { "x-token": { keep: true } },
          custom: "kept",
        },
      },
      typography: {
        body: { $value: "Inter", $type: "fontFamily", $extensions: { "x-font": true } },
      },
    };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "original",
      plan: orderedPlan([
        change("color.neutral.100", { proposedToken: { $value: "#ffffff", $type: "color", $extensions: { "x-preset": true } } }),
        change("color.brand", { operation: "update", proposedToken: { $description: "Brand color" } }),
      ]),
    });

    expect(result.status).toBe("built");
    expect(result.document).toEqual({
      $extensions: { "x-host": { owner: "team" } },
      color: {
        $extensions: { "x-color": true },
        brand: {
          $value: "#123456",
          $type: "color",
          $extensions: { "x-token": { keep: true } },
          custom: "kept",
          $description: "Brand color",
        },
        neutral: { "100": { $value: "#ffffff", $type: "color", $extensions: { "x-preset": true } } },
      },
      typography: {
        body: { $value: "Inter", $type: "fontFamily", $extensions: { "x-font": true } },
      },
    });
    expect(host.color.brand).not.toHaveProperty("$description");
  });

  it("does not replace an existing description during candidate construction", () => {
    const host = { color: { brand: { $value: "#123456", $type: "color", $description: "Host text" } } };
    const result = buildPresetCandidateDocument({
      hostDocument: host,
      originalBytes: "original",
      plan: orderedPlan([change("color.brand", { operation: "update", proposedToken: { $description: "Preset text" } })]),
    });

    expect(result.status).toBe("built");
    expect(result.document).toEqual(host);
    expect(result.appliedChanges).toBe(0);
  });
});
