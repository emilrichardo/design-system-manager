// Fixtures puros para los tests de puertos de 002 (sin filesystem, sin Node).
import type { HostRoot } from "../../src/application/ports.js";
import type { DesignSystemAnalysis } from "../../src/domain/analysis/design-system-analysis.js";
import { emptyStatistics } from "../../src/domain/analysis/inspection-statistics.js";
import { noLimitsReached } from "../../src/domain/traversal/limits.js";

export function hostRoot(rootDir = "/repo"): HostRoot {
  return {
    executionDir: rootDir,
    rootDir,
    packageJsonPath: `${rootDir}/package.json`,
    gitRootDir: rootDir,
    writeBoundary: rootDir,
    isMonorepoChild: false,
  };
}

export function designSystemAnalysis(
  overrides: Partial<DesignSystemAnalysis> = {},
): DesignSystemAnalysis {
  return {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    presence: { present: ["neuraz-ds.config.json"], missing: [] },
    structuralState: "complete-valid",
    documents: {},
    nodes: [],
    statistics: emptyStatistics,
    errors: [],
    warnings: [],
    limits: noLimitsReached,
    valid: true,
    ...overrides,
  };
}
