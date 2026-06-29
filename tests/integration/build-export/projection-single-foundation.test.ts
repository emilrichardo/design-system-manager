// T023 (006) — La proyección normalizada reutiliza la ÚNICA proyección de foundations del snapshot: no
// recalcula foundations (ni por token ni por renderer) ni reejecuta el analyzer.
import { afterEach, describe, expect, it } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { projectFoundations } from "../../../src/application/foundations/project-foundations.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("projection single foundation (T023)", () => {
  it("foundation projection se ejecuta exactamente una vez; la proyección normalizada no la repite", async () => {
    const dir = await makeProject(bag, { tokens: { color: { gray: { $type: "color", $value: COLOR } } } });

    let foundationProjections = 0;
    let analyzerCalls = 0;
    const baseAnalyzer = createDtcgAnalyzer();
    const reader = createBuildSnapshotReader({
      dtcgAnalyzer: {
        analyze: (doc) => {
          analyzerCalls += 1;
          return baseAnalyzer.analyze(doc);
        },
      },
      projectMetadata: projectFoundationMetadata,
      projectInspection: (analysis, metadata) => {
        foundationProjections += 1;
        return projectFoundations(analysis, metadata);
      },
    });

    const r = await reader.read({ executionDir: dir });
    expect(r.outcome).toBe("ready");
    expect(foundationProjections).toBe(1);
    expect(analyzerCalls).toBe(1);

    if (r.outcome !== "ready") return;
    const result = createBuildProjection(r.snapshot);
    expect(result.ok).toBe(true);
    // La proyección normalizada NO vuelve a proyectar foundations ni reanaliza.
    expect(foundationProjections).toBe(1);
    expect(analyzerCalls).toBe(1);
  });
});
