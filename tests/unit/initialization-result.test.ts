import { describe, expect, it } from "vitest";
import {
  cancelled,
  conflict,
  created,
  failed,
  unchanged,
} from "../../src/domain/result/initialization-result.js";

describe("InitializationResult (T015)", () => {
  it("created lleva la lista de archivos", () => {
    const r = created(["neuraz-ds.config.json"]);
    expect(r.status).toBe("created");
    if (r.status === "created") expect(r.files).toEqual(["neuraz-ds.config.json"]);
  });

  it("unchanged lleva una razón", () => {
    const r = unchanged("ya inicializado y válido");
    expect(r.status).toBe("unchanged");
    if (r.status === "unchanged") expect(r.reason).toMatch(/inicializado/);
  });

  it("cancelled no lleva datos adicionales", () => {
    const r = cancelled();
    expect(r.status).toBe("cancelled");
    expect(Object.keys(r)).toEqual(["status"]);
  });

  it("conflict enumera los conflictos", () => {
    const r = conflict(["neuraz-ds.config.json"]);
    expect(r.status).toBe("conflict");
    if (r.status === "conflict") expect(r.conflicts).toHaveLength(1);
  });

  it.each(["host", "validation", "filesystem", "post-verify"] as const)(
    "failed/%s lleva categoría y errores",
    (category) => {
      const r = failed(category, [{ code: `${category}-x`, message: "msg" }]);
      expect(r.status).toBe("failed");
      if (r.status === "failed") {
        expect(r.category).toBe(category);
        expect(r.errors).toHaveLength(1);
      }
    },
  );

  it("ningún resultado expone un exit code en el dominio", () => {
    const samples = [
      created([]),
      unchanged("x"),
      cancelled(),
      conflict([]),
      failed("validation", []),
    ];
    for (const r of samples) {
      expect(r).not.toHaveProperty("exitCode");
      expect(r).not.toHaveProperty("code");
    }
  });
});
