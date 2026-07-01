// T048 (009) — Total consolidado = suma de fuentes + `stale-build`; `stale-build` siempre `warning`.
import { describe, expect, it } from "vitest";
import { aliasStateIssue, buildStaleIssue, mapAssetIssueToViewerIssue, projectAllIssues, projectIssues } from "../../../src/application/viewer/issue.js";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";

describe("projectIssues / projectAllIssues (T048)", () => {
  it("orden canónico fijo: validation, foundations, assets, aliases, build", () => {
    const issues = projectIssues({
      validation: [analysisError("dtcg-x", "m1")],
      foundations: [analysisWarning("foundation-y", "m2")],
      assets: [mapAssetIssueToViewerIssue({ code: "license-required", path: null, severity: "warning", message: "m3" })],
      aliases: [aliasStateIssue("a.b", "missing")],
      build: [buildStaleIssue()],
    });
    expect(issues.map((i) => i.source)).toEqual(["validation", "foundations", "assets", "aliases", "build"]);
  });

  it("total consolidado = suma exacta de todas las fuentes", () => {
    const issues = projectAllIssues({
      validation: [analysisError("e1", "m"), analysisWarning("w1", "m")],
      foundations: [analysisWarning("foundation-token-unclassified", "m")],
      assetConflicts: [{ code: "license-required", path: "x", severity: "warning", message: "m" }],
      aliasNodes: [
        { path: "a", aliasState: "missing" },
        { path: "b", aliasState: "cyclic" },
        { path: "c", aliasState: "valid" }, // no genera issue
        { path: "d", aliasState: "n/a" }, // no genera issue
      ],
      buildStale: true,
    });
    expect(issues).toHaveLength(2 + 1 + 1 + 2 + 1);
  });

  it("stale-build siempre es warning (nunca bloqueante — el Viewer no puede reconstruir)", () => {
    const issue = buildStaleIssue();
    expect(issue.severity).toBe("warning");
    expect(issue.source).toBe("build");
    expect(issue.code).toBe("stale-build");
  });

  it("buildStale=false no agrega ningún issue de build", () => {
    const issues = projectAllIssues({ validation: [], foundations: [], assetConflicts: [], aliasNodes: [], buildStale: false });
    expect(issues.filter((i) => i.source === "build")).toEqual([]);
  });

  it("alias válido o n/a nunca genera un issue sintético", () => {
    const issues = projectAllIssues({
      validation: [],
      foundations: [],
      assetConflicts: [],
      aliasNodes: [
        { path: "a", aliasState: "valid" },
        { path: "b", aliasState: "n/a" },
      ],
      buildStale: false,
    });
    expect(issues).toEqual([]);
  });

  it("cada código de alias produce el mensaje/severidad correctos (missing/to-group/cyclic/malformed)", () => {
    for (const state of ["missing", "to-group", "cyclic", "malformed"] as const) {
      const issue = aliasStateIssue("x.y", state);
      expect(issue.code).toBe(state);
      expect(issue.severity).toBe("error");
      expect(issue.source).toBe("aliases");
    }
  });

  it("nunca expone Error/stack/path absoluto en ningún issue mapeado", () => {
    const issues = projectAllIssues({
      validation: [analysisError("e1", "m", { path: "a.b" })],
      foundations: [],
      assetConflicts: [],
      aliasNodes: [],
      buildStale: false,
    });
    const text = JSON.stringify(issues);
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//);
    expect(text).not.toContain("stack");
  });
});
