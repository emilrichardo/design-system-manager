// T022 (004) — Estado de categoría con precedencia invalid > partial > complete > absent.
import { describe, expect, it } from "vitest";
import {
  computeCategoryState,
  FOUNDATION_CATEGORY_STATE_PRECEDENCE,
} from "../../../src/domain/foundations/category-state.js";

describe("computeCategoryState (T021/T022)", () => {
  it("sin tokens ni señales → absent", () => {
    expect(computeCategoryState({ tokenCount: 0, invalid: false, partial: false })).toBe("absent");
  });

  it("tokens sin señales invalidantes/parciales → complete", () => {
    expect(computeCategoryState({ tokenCount: 2, invalid: false, partial: false })).toBe("complete");
  });

  it("partial gana sobre complete", () => {
    expect(computeCategoryState({ tokenCount: 2, invalid: false, partial: true })).toBe("partial");
  });

  it("invalid gana sobre partial, complete y absent", () => {
    expect(computeCategoryState({ tokenCount: 0, invalid: true, partial: true })).toBe("invalid");
    expect(computeCategoryState({ tokenCount: 3, invalid: true, partial: false })).toBe("invalid");
  });

  it("la precedencia canónica es explícita e inmutable", () => {
    expect(FOUNDATION_CATEGORY_STATE_PRECEDENCE).toEqual(["absent", "complete", "partial", "invalid"]);
    expect(Object.isFrozen(FOUNDATION_CATEGORY_STATE_PRECEDENCE)).toBe(true);
  });
});
