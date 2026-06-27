// T006 (003) — toJsonIssue: cinco campos públicos, null para ausentes, sin context/stack.
import { describe, expect, it } from "vitest";
import { toJsonIssue } from "../../../src/application/json/map-issue.js";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";

describe("toJsonIssue (T006)", () => {
  it("error completo (document + path)", () => {
    const issue = analysisError("dtcg-type-unrecognized", "tipo no reconocido", {
      document: "tokens",
      path: "color.brand.primary",
    });
    expect(toJsonIssue(issue)).toEqual({
      severity: "error",
      code: "dtcg-type-unrecognized",
      message: "tipo no reconocido",
      document: "tokens",
      path: "color.brand.primary",
    });
  });

  it("warning completo", () => {
    const issue = analysisWarning("dtcg-type-not-deeply-inspected", "no profundo", {
      document: "tokens",
      path: "space.md",
    });
    expect(toJsonIssue(issue).severity).toBe("warning");
  });

  it("sin document → null; sin path → null", () => {
    const out = toJsonIssue(analysisError("read-failed", "EACCES"));
    expect(out.document).toBeNull();
    expect(out.path).toBeNull();
  });

  it("descarta context interno", () => {
    const issue = analysisError("x", "m", { document: "tokens", context: { secret: "no-exponer" } });
    const out = toJsonIssue(issue);
    expect("context" in out).toBe(false);
    expect(Object.keys(out).sort()).toEqual(["code", "document", "message", "path", "severity"]);
  });

  it("no muta el issue congelado; determinista", () => {
    const issue = Object.freeze(analysisError("c", "m", { path: "a.b" }));
    expect(toJsonIssue(issue)).toEqual(toJsonIssue(issue));
    expect(issue.code).toBe("c");
  });
});
