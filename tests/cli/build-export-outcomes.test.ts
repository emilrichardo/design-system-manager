// T104 (006) — Uniones de outcomes exactas: build 9, export 5, `internal-error` solo adapter; ausencia
// de outcomes prohibidos en el dominio.
import { describe, expect, it } from "vitest";
import { BUILD_OUTCOMES, EXPORT_OUTCOMES } from "../../src/domain/build-export/build-outcome.js";

const FORBIDDEN = ["success", "partial", "partially-built", "blocked", "validation", "unexpected", "failed", "internal-error"];

describe("build/export outcomes (T104)", () => {
  it("build tiene exactamente 9 outcomes", () => {
    expect([...BUILD_OUTCOMES]).toEqual(["built", "unchanged", "invalid-design-system", "unsupported-value", "conflict", "not-found", "read-error", "write-error", "verification-error"]);
  });

  it("export tiene exactamente 5 outcomes", () => {
    expect([...EXPORT_OUTCOMES]).toEqual(["exported", "invalid-design-system", "unsupported-value", "not-found", "read-error"]);
  });

  it("`internal-error` NO está en las uniones de dominio (solo adapter)", () => {
    expect((BUILD_OUTCOMES as readonly string[]).includes("internal-error")).toBe(false);
    expect((EXPORT_OUTCOMES as readonly string[]).includes("internal-error")).toBe(false);
  });

  it("no aparecen outcomes prohibidos", () => {
    for (const f of FORBIDDEN) {
      expect((BUILD_OUTCOMES as readonly string[]).includes(f)).toBe(false);
      expect((EXPORT_OUTCOMES as readonly string[]).includes(f)).toBe(false);
    }
  });
});
