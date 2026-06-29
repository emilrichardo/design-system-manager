import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type { AnalyzePresetTokens, PresetTokenAnalysis, PresetTokenNode } from "../../../src/application/presets/preset-ports.js";

export const tokenNode = (path: string): PresetTokenNode => ({
  path,
  category: path.split(".")[0] as PresetTokenNode["category"],
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  typeSourcePath: null,
  kind: "concrete",
  aliasTarget: null,
  aliasState: "n/a",
  trust: "valid",
  level: "primitive",
  levelSource: "token",
  levelSourcePath: path,
  typeCompatibility: "compatible",
});

export function presetAnalysis(nodes: readonly PresetTokenNode[] = [tokenNode("color.brand")]): PresetTokenAnalysis {
  return { nodes, errors: [], warnings: [], foundationIssues: [], limits: noLimitsReached, topLevelKeys: ["color"] };
}

export const analyzeOk: AnalyzePresetTokens = () => presetAnalysis();
