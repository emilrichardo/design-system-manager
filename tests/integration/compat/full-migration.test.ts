import { afterEach, describe, expect, it } from "vitest";
import { createBoundAnalyze } from "../../../src/cli/composition.js";
import { classifyAnalysisOutcome } from "../../../src/application/classify-analysis-outcome.js";
import { buildViewerSession } from "../../../src/application/viewer/build-session.js";
import { buildViewerSectionDetail } from "../../../src/application/viewer/build-section-detail.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { validProject } from "../../helpers/ds-fixtures.js";
import { runBinary } from "../../helpers/run-binary.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

describe("full migration compatibility (011 T028)", () => {
  const projects: TmpProject[] = [];

  afterEach(async () => {
    await Promise.all(projects.map((project) => project.cleanup()));
    projects.length = 0;
  });

  it("un fixture equivalente a 001-010 conserva validate/inspect/foundations/view sin regresiones observables", async () => {
    const dir = await validProject(projects);
    const analyze = createBoundAnalyze();
    const analysis = await analyze({ executionDir: dir });

    expect(classifyAnalysisOutcome(analysis)).toBe("valid");
    expect(analysis.errors).toEqual([]);
    expect(analysis.warnings.map((issue) => issue.code)).not.toEqual(
      expect.arrayContaining([
        "brand-asset-reference-missing",
        "token-layer-unclassified",
        "component-token-bypasses-semantic",
        "brand-token-bypasses-semantic",
      ]),
    );

    const validate = await runBinary(["validate", "--json"], dir);
    expect(validate.code).toBe(0);
    expect(JSON.parse(validate.stdout)).toMatchObject({ formatVersion: "1.0.0", command: "validate", outcome: "valid" });

    const inspect = await runBinary(["inspect", "--json"], dir);
    expect(inspect.code).toBe(0);
    expect(JSON.parse(inspect.stdout)).toMatchObject({
      formatVersion: "1.0.0",
      command: "inspect",
      outcome: "valid",
      result: { tokens: { total: 2 } },
    });

    const foundations = await runBinary(["foundations", "--json"], dir);
    expect(foundations.code).toBe(4);
    const foundationsJson = JSON.parse(foundations.stdout) as {
      readonly formatVersion: string;
      readonly command: string;
      readonly outcome: string;
      readonly result: { readonly validation: { readonly warnings: readonly { readonly code: string }[] } };
    };
    expect(foundationsJson).toMatchObject({ formatVersion: "1.0.0", command: "foundations", outcome: "partial" });
    expect(foundationsJson.result.validation.warnings.map((issue) => issue.code)).not.toEqual(
      expect.arrayContaining(["token-layer-unclassified", "component-token-bypasses-semantic", "brand-token-bypasses-semantic"]),
    );

    const view = await runBinary(["view", "--json"], dir);
    expect(view.code).toBe(0);
    const viewJson = JSON.parse(view.stdout) as {
      readonly formatVersion: string;
      readonly section: string;
      readonly state: string;
      readonly data: {
        readonly navigation: { readonly sections: readonly { readonly id: string }[] } | null;
      };
    };
    expect(viewJson).toMatchObject({ formatVersion: "1.0.0", section: "session", state: "ready" });
    expect(viewJson.data.navigation?.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["overview", "colors", "typography", "foundations", "brand", "components", "quality"]),
    );

    const deps = realViewerDeps(dir, newCallCounts());
    const brandDetail = await buildViewerSectionDetail({ executionDir: dir }, deps, "brand");
    expect(brandDetail.state).toBe("ready");
    expect(brandDetail.data).toMatchObject({ status: "absent", profile: null, voice: null, visualLanguage: null, assetGroups: [] });

    const componentDetail = await buildViewerSectionDetail({ executionDir: dir }, deps, "components");
    expect(componentDetail.state).toBe("ready");
    expect(componentDetail.data).toEqual([]);

    const qualityDetail = await buildViewerSectionDetail({ executionDir: dir }, deps, "quality");
    expect(qualityDetail.state).toBe("ready");
    expect(qualityDetail.data).toMatchObject({
      counters: {
        brand: { overallStatus: "absent", missingAssets: [] },
        tokens: { component: 0, brandRole: 0, unclassified: 0, componentBypassesSemantic: 0, brandBypassesSemantic: 0 },
        components: { groups: 0, componentTokens: 0 },
      },
    });
    const qualityJson = JSON.stringify(qualityDetail.data);
    expect(qualityJson).not.toMatch(/\/(Users|home|Volumes)\//);
  });
});
