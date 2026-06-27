// T007 (003) — toJsonHost / toJsonLimits / toJsonSummary: copias defensivas y null policy.
import { describe, expect, it } from "vitest";
import { toJsonHost, toJsonLimits, toJsonSummary } from "../../../src/application/json/map-common.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";

describe("toJsonHost (T007)", () => {
  it("null → null", () => {
    expect(toJsonHost(null)).toBeNull();
  });

  it("copia root y designSystemPath", () => {
    expect(toJsonHost({ root: "/repo", designSystemPath: "/repo/design-system" })).toEqual({
      root: "/repo",
      designSystemPath: "/repo/design-system",
    });
  });

  it("designSystemPath puede ser null", () => {
    expect(toJsonHost({ root: "/repo", designSystemPath: null })).toEqual({
      root: "/repo",
      designSystemPath: null,
    });
  });
});

describe("toJsonLimits (T007)", () => {
  it("sin límites → hits []", () => {
    expect(toJsonLimits(noLimitsReached)).toEqual({ reached: false, partial: false, hits: [] });
  });

  it("preserva el orden de hits y copia (sin compartir referencia)", () => {
    const limits = analysisLimitsResult([
      { limit: "nodes", detail: ">100000" },
      { limit: "depth", detail: ">32" },
    ]);
    const out = toJsonLimits(limits);
    expect(out).toEqual({
      reached: true,
      partial: true,
      hits: [
        { limit: "nodes", detail: ">100000" },
        { limit: "depth", detail: ">32" },
      ],
    });
    expect(out.hits).not.toBe(limits.hits);
  });

  it("no muta la entrada congelada", () => {
    const limits = Object.freeze(analysisLimitsResult([Object.freeze({ limit: "issues", detail: ">1000" })]));
    expect(() => toJsonLimits(limits)).not.toThrow();
  });
});

describe("toJsonSummary (T007)", () => {
  it("tokens presente se conserva", () => {
    expect(toJsonSummary({ errors: 1, warnings: 2, tokens: 42 })).toEqual({
      errors: 1,
      warnings: 2,
      tokens: 42,
    });
  });

  it("tokens ausente → null (nunca undefined)", () => {
    const out = toJsonSummary({ errors: 0, warnings: 0 });
    expect(out.tokens).toBeNull();
    expect("tokens" in out).toBe(true);
  });
});
