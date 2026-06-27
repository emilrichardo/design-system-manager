// Fixtures puros para los tests de puertos de 002 (sin filesystem, sin Node).
import type { HostRoot } from "../../src/application/ports.js";
import type { DesignSystemAnalysis, ParsedDocument } from "../../src/domain/analysis/design-system-analysis.js";
import type { AnalysisIssue } from "../../src/domain/analysis/analysis-issue.js";
import { analysisError } from "../../src/domain/analysis/analysis-issue.js";
import { emptyStatistics } from "../../src/domain/analysis/inspection-statistics.js";
import { analysisLimitsResult, noLimitsReached } from "../../src/domain/traversal/limits.js";

const CONFIG = "neuraz-ds.config.json";
const MANIFEST = "design-system/design-system.json";
const TOKENS = "design-system/tokens/base.tokens.json";

function doc(
  relativePath: string,
  trust: ParsedDocument["trust"],
  parsed?: unknown,
  issues: readonly AnalysisIssue[] = [],
): ParsedDocument {
  const exists = trust !== "unavailable" || parsed !== undefined;
  return { relativePath, exists, kind: exists ? "file" : "absent", parsed, trust, issues };
}

const VALID_MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", description: "d" };
const VALID_CONFIG = { configSchemaVersion: "0.1.0", designSystemDir: "design-system", formatVersion: "2025.10" };

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

/** Host de análisis ({root, designSystemPath}) usado por resultados/reporters de 002. */
export function analysisHost(root = "/repo", designSystemPath: string | null = "/repo/design-system") {
  return { root, designSystemPath } as const;
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

// ── Builders de variantes de DesignSystemAnalysis para probar proyecciones (sin tubería real). ──

/** complete-valid: los tres documentos parseados y válidos. */
export function analysisValid(): DesignSystemAnalysis {
  return designSystemAnalysis({
    presence: { present: [CONFIG, MANIFEST, TOKENS], missing: [] },
    documents: {
      [CONFIG]: doc(CONFIG, "valid", VALID_CONFIG),
      [MANIFEST]: doc(MANIFEST, "valid", VALID_MANIFEST),
      [TOKENS]: doc(TOKENS, "valid", { color: {} }),
    },
    statistics: { ...emptyStatistics, total: 2, groups: 1, concreteValues: 1, aliases: 1, byType: { color: 2 }, maxDepth: 2 },
    nodes: [],
  });
}

/** not-initialized: ningún documento presente. */
export function analysisNotInitialized(): DesignSystemAnalysis {
  return designSystemAnalysis({
    presence: { present: [], missing: [CONFIG, MANIFEST, TOKENS] },
    structuralState: "not-initialized",
    documents: {
      [CONFIG]: doc(CONFIG, "unavailable"),
      [MANIFEST]: doc(MANIFEST, "unavailable"),
      [TOKENS]: doc(TOKENS, "unavailable"),
    },
    valid: false,
  });
}

/** partial: falta el documento de tokens. */
export function analysisPartial(): DesignSystemAnalysis {
  return designSystemAnalysis({
    presence: { present: [CONFIG, MANIFEST], missing: [TOKENS] },
    structuralState: "partial",
    documents: {
      [CONFIG]: doc(CONFIG, "valid", VALID_CONFIG),
      [MANIFEST]: doc(MANIFEST, "valid", VALID_MANIFEST),
      [TOKENS]: doc(TOKENS, "unavailable"),
    },
    valid: false,
  });
}

/** complete-invalid SEMÁNTICO: tres presentes, tokens con tipo desconocido. */
export function analysisCompleteInvalid(): DesignSystemAnalysis {
  const err = analysisError("dtcg-type-unrecognized", "tipo no reconocido", { document: "tokens", path: "g.t" });
  return designSystemAnalysis({
    presence: { present: [CONFIG, MANIFEST, TOKENS], missing: [] },
    structuralState: "complete-invalid",
    documents: {
      [CONFIG]: doc(CONFIG, "valid", VALID_CONFIG),
      [MANIFEST]: doc(MANIFEST, "valid", VALID_MANIFEST),
      [TOKENS]: doc(TOKENS, "recovered", { g: { t: { $type: "weird", $value: "v" } } }, [err]),
    },
    statistics: { ...emptyStatistics, total: 1, groups: 1, byType: { weird: 1 } },
    errors: [err],
    valid: false,
  });
}

/** complete-invalid OPERATIVO: tres presentes, tokens con error de lectura. */
export function analysisReadError(): DesignSystemAnalysis {
  const err = analysisError("read-failed", "EACCES", { document: "tokens", path: TOKENS });
  return designSystemAnalysis({
    presence: { present: [CONFIG, MANIFEST, TOKENS], missing: [] },
    structuralState: "complete-invalid",
    documents: {
      [CONFIG]: doc(CONFIG, "valid", VALID_CONFIG),
      [MANIFEST]: doc(MANIFEST, "valid", VALID_MANIFEST),
      [TOKENS]: doc(TOKENS, "unavailable", undefined, [err]),
    },
    errors: [err],
    valid: false,
  });
}

/** Falla de host: issue document "host"; estructura not-initialized. */
export function analysisHostFailure(): DesignSystemAnalysis {
  const err = analysisError("host-package-json-missing", "sin package.json", { document: "host" });
  return designSystemAnalysis({
    host: { root: "/exec", designSystemPath: null },
    presence: { present: [], missing: [CONFIG, MANIFEST, TOKENS] },
    structuralState: "not-initialized",
    documents: {},
    errors: [err],
    valid: false,
  });
}

/** partial por límite duro (análisis parcial). */
export function analysisPartialByLimit(): DesignSystemAnalysis {
  return designSystemAnalysis({
    presence: { present: [CONFIG, MANIFEST, TOKENS], missing: [] },
    structuralState: "complete-invalid",
    documents: {
      [CONFIG]: doc(CONFIG, "valid", VALID_CONFIG),
      [MANIFEST]: doc(MANIFEST, "valid", VALID_MANIFEST),
      [TOKENS]: doc(TOKENS, "recovered", { color: {} }, []),
    },
    errors: [analysisError("limit-nodes-exceeded", "demasiados nodos", { document: "tokens" })],
    limits: analysisLimitsResult([{ limit: "nodes", detail: ">100000" }]),
    valid: false,
  });
}

export const FIXTURE_PATHS = { CONFIG, MANIFEST, TOKENS } as const;
