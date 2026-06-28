// T048 (004) - Foundations llama analyze/proyeccion una sola vez; reporter/mapper no reanalizan.
import { describe, expect, it, vi } from "vitest";
import { inspectFoundations } from "../../../src/application/foundations/inspect-foundations.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { projectFoundations } from "../../../src/application/foundations/project-foundations.js";
import { toFoundationsJsonEnvelope } from "../../../src/application/foundations/json/map-foundations.js";
import { FoundationsJsonReporter } from "../../../src/infrastructure/reporter/foundations-json-reporter.js";
import { analysisValid } from "../../helpers/analysis-fixtures.js";
import { foundation } from "./foundations-test-helpers.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";

describe("foundations single-analysis (T048)", () => {
  it("analyze, metadata y projection corren una sola vez", async () => {
    const analysis = {
      ...analysisValid(),
      documents: {
        ...analysisValid().documents,
        [MANAGED_FILES.tokens]: {
          ...analysisValid().documents[MANAGED_FILES.tokens]!,
          parsed: { color: { base: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" }, ...foundation("primitive") } } },
        },
      },
      nodes: [{
        path: "color.base",
        declaredType: "color",
        effectiveType: "color",
        typeOrigin: "own" as const,
        typeSourcePath: null,
        kind: "concrete" as const,
        aliasTarget: null,
        aliasState: "n/a" as const,
        description: null,
        depth: 2,
        trust: "valid" as const,
      }],
    };
    const analyze = vi.fn(async () => analysis);
    const projectMetadata = vi.fn(projectFoundationMetadata);
    const projectInspection = vi.fn(projectFoundations);
    const out = vi.fn();
    const reporter = new FoundationsJsonReporter({ out, err: vi.fn() });

    const result = await inspectFoundations(
      { executionDir: "/repo" },
      { analyze, reporter, projectMetadata, projectInspection },
    );
    toFoundationsJsonEnvelope(result);

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(projectMetadata).toHaveBeenCalledTimes(1);
    expect(projectInspection).toHaveBeenCalledTimes(1);
    expect(out).toHaveBeenCalledTimes(1);
  });
});
