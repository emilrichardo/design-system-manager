// T007 (004) — La API pública (dominio + aplicación) expone el registro y los tipos de foundations.
import { describe, expect, it } from "vitest";
import { FOUNDATION_CATEGORY_IDS, FOUNDATION_ISSUE_CODES } from "../../../src/domain/index.js";
import type { FoundationLevel, FoundationCategoryState } from "../../../src/domain/index.js";
import type { FoundationsResult, FoundationsInspection } from "../../../src/application/index.js";

describe("exports foundations (T007)", () => {
  it("dominio reexporta el registro y los issue codes", () => {
    expect(FOUNDATION_CATEGORY_IDS[0]).toBe("color");
    expect(FOUNDATION_ISSUE_CODES.levelInvalid).toBe("foundation-level-invalid");
  });

  it("los tipos públicos son usables (type-only)", () => {
    const level: FoundationLevel = "unclassified";
    const state: FoundationCategoryState = "absent";
    expect([level, state]).toEqual(["unclassified", "absent"]);
    const notFound: FoundationsResult = { outcome: "not-found", host: null, inspection: null, hostError: null };
    expect(notFound.outcome).toBe("not-found");
    // `FoundationsInspection` usable como anotación.
    const hostOnly: Pick<FoundationsInspection, "structuralState"> = { structuralState: "complete-valid" };
    expect(hostOnly.structuralState).toBe("complete-valid");
  });
});
