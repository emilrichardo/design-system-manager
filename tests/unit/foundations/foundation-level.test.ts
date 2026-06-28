// T001 (004) — FoundationLevel/Source/Resolution: tipos y null policy (sin lógica de resolución aún).
import { describe, expect, it } from "vitest";
import type {
  FoundationLevel,
  FoundationLevelResolution,
  FoundationLevelSource,
  PersistedFoundationLevel,
} from "../../../src/domain/foundations/foundation-level.js";

describe("Foundation level types (T001)", () => {
  it("PersistedFoundationLevel admite primitive/semantic (no unclassified)", () => {
    const persisted: PersistedFoundationLevel[] = ["primitive", "semantic"];
    expect(persisted).toEqual(["primitive", "semantic"]);
    // @ts-expect-error unclassified no es persistible
    const bad: PersistedFoundationLevel = "unclassified";
    expect(bad).toBe("unclassified");
  });

  it("FoundationLevel añade el estado derivado unclassified", () => {
    const levels: FoundationLevel[] = ["primitive", "semantic", "unclassified"];
    expect(levels).toContain("unclassified");
  });

  it("FoundationLevelSource cubre token/group/none/invalid", () => {
    const sources: FoundationLevelSource[] = ["token", "group", "none", "invalid"];
    expect(sources).toHaveLength(4);
  });

  it("resoluciones válidas siguen la null policy (sourcePath null, sin undefined)", () => {
    const own: FoundationLevelResolution = { level: "primitive", source: "token", sourcePath: "color.blue.500", valid: true };
    const none: FoundationLevelResolution = { level: "unclassified", source: "none", sourcePath: null, valid: true };
    const invalid: FoundationLevelResolution = { level: "unclassified", source: "invalid", sourcePath: "color.base", valid: false };
    for (const r of [own, none, invalid]) {
      expect("sourcePath" in r).toBe(true);
      expect(r.sourcePath === null || typeof r.sourcePath === "string").toBe(true);
    }
    expect(none.sourcePath).toBeNull();
    expect(invalid.valid).toBe(false);
  });
});
