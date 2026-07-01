import { afterEach, describe, expect, it } from "vitest";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { inspectFoundations } from "../../../src/application/foundations/inspect-foundations.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { validProject } from "../../helpers/ds-fixtures.js";

describe("legacy token-only compatibility (011 T015)", () => {
  const projects: TmpProject[] = [];

  afterEach(async () => {
    await Promise.all(projects.map((project) => project.cleanup()));
    projects.length = 0;
  });

  it("un proyecto 001-010 sin brand/ ni metadata de layer no recibe issues nuevos de 011", async () => {
    const dir = await validProject(projects);
    const analyze = createBoundAnalyze();
    const analysis = await analyze({ executionDir: dir });

    expect(analysis.errors.map((issue) => issue.code)).not.toContain("brand-asset-reference-missing");
    expect(analysis.warnings.map((issue) => issue.code)).not.toContain("token-layer-unclassified");
    expect(analysis.warnings.map((issue) => issue.code)).not.toContain("component-token-bypasses-semantic");
    expect(analysis.warnings.map((issue) => issue.code)).not.toContain("brand-token-bypasses-semantic");

    const reporter = { completed: () => undefined };
    const foundations = await inspectFoundations({ executionDir: dir }, { analyze, reporter });
    if (foundations.outcome === "valid" || foundations.outcome === "partial" || foundations.outcome === "complete-invalid") {
      expect(foundations.inspection.validation.warnings.map((issue) => issue.code)).not.toContain("token-layer-unclassified");
      expect(foundations.inspection.validation.warnings.map((issue) => issue.code)).not.toContain("component-token-bypasses-semantic");
      expect(foundations.inspection.validation.warnings.map((issue) => issue.code)).not.toContain("brand-token-bypasses-semantic");
      return;
    }
    expect.fail(`unexpected outcome ${foundations.outcome}`);
  });
});
