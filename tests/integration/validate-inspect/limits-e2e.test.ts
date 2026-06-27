// T043 + T013 — Límites (inyectados) y tope global de issues, vía tubería real con límites reducidos.
import { afterEach, describe, expect, it } from "vitest";
import { analyzeExistingDesignSystem, type PipelineLimits } from "../../../src/application/analyze-existing-design-system.js";
import { classifyAnalysisOutcome } from "../../../src/application/classify-analysis-outcome.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import type { AnalyzeDesignSystemDependencies } from "../../../src/application/analysis-ports.js";
import { hostRootResolver, documentValidators } from "../../../src/infrastructure/initialize-adapters.js";
import { inspectPresence } from "../../../src/infrastructure/host-root/inspect-presence.js";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { traverseDtcgTree } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";
import { makeProject, COLOR } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

// Los límites del ÁRBOL viven en el analyzer (traversal); el presupuesto de BYTES en la tubería.
function deps(treeLimits?: PipelineLimits): AnalyzeDesignSystemDependencies {
  return {
    hostRootResolver,
    presenceInspector: { inspectPresence },
    documentReader: createManagedDocumentReader({ fileSystem: nodeFileSystem }),
    documentValidators,
    dtcgAnalyzer: treeLimits === undefined ? createDtcgAnalyzer() : { analyze: (d) => traverseDtcgTree(d, treeLimits) },
  };
}
const L = (over: Partial<PipelineLimits>): PipelineLimits => ({ ...ANALYSIS_LIMITS, ...over });

/** `tree` inyecta límites de recorrido (depth/nodes/path/alias/issues); `bytes` el presupuesto de la tubería. */
async function analyzeWith(tokens: unknown, opts: { tree?: PipelineLimits; bytes?: PipelineLimits } = {}) {
  const root = await makeProject(projects, { tokens });
  const a = await analyzeExistingDesignSystem({ executionDir: root }, deps(opts.tree), opts.bytes ?? ANALYSIS_LIMITS);
  return { a, outcome: classifyAnalysisOutcome(a), exit: exitCodeForOutcome(classifyAnalysisOutcome(a)) };
}
const codes = (a: { errors: readonly { code: string }[] }) => a.errors.map((i) => i.code);

describe("T043 — límites semánticos del árbol → complete-invalid / exit 3", () => {
  it("maxDepth: profundidad excedida → limit-depth-exceeded, partial, exit 3", async () => {
    const { a, exit } = await analyzeWith({ a: { b: { c: { $type: "color", $value: COLOR, $description: "d" } } } }, { tree: L({ maxDepth: 2 }) });
    expect(codes(a)).toContain("limit-depth-exceeded");
    expect(a.limits.partial).toBe(true);
    expect(a.valid).toBe(false);
    expect(exit).toBe(3);
  });

  it("maxNodes: nodos excedidos → limit-nodes-exceeded, conserva lo analizado, exit 3", async () => {
    const { a, exit } = await analyzeWith({ g: { a: { $type: "color", $value: COLOR, $description: "d" }, b: { $type: "color", $value: COLOR, $description: "d" }, c: { $type: "color", $value: COLOR, $description: "d" } } }, { tree: L({ maxNodes: 2 }) });
    expect(codes(a)).toContain("limit-nodes-exceeded");
    expect(a.limits.partial).toBe(true);
    expect(exit).toBe(3);
  });

  it("maxPathLength: ruta demasiado larga → limit-path-len-exceeded, exit 3", async () => {
    const { a, exit } = await analyzeWith({ averylongtokenname: { $type: "color", $value: COLOR, $description: "d" } }, { tree: L({ maxPathLength: 3 }) });
    expect(codes(a)).toContain("limit-path-len-exceeded");
    expect(exit).toBe(3);
  });

  it("maxAliasLength: alias demasiado largo → alias-too-long + hit alias-len + partial, exit 3", async () => {
    const { a, exit } = await analyzeWith({ color: { base: { $type: "color", $value: COLOR, $description: "d" }, ref: { $value: "{color.base}", $description: "d" } } }, { tree: L({ maxAliasLength: 3 }) });
    expect(codes(a)).toContain("alias-too-long");
    expect(a.limits.hits.some((h) => h.limit === "alias-len")).toBe(true);
    expect(a.limits.partial).toBe(true);
    expect(exit).toBe(3);
  });
});

describe("T043 — límites operativos de bytes → read-error / exit 6", () => {
  it("maxFileBytes minúsculo → limit-file-size-exceeded, read-error, exit 6", async () => {
    const { a, exit } = await analyzeWith({ c: { $type: "color", $value: COLOR, $description: "d" } }, { bytes: L({ maxFileBytes: 4 }) });
    expect(codes(a)).toContain("limit-file-size-exceeded");
    expect(exit).toBe(6);
  });

  it("maxTotalBytes minúsculo → limit-total-size-exceeded, read-error, exit 6", async () => {
    const { a, exit } = await analyzeWith({ c: { $type: "color", $value: COLOR, $description: "d" } }, { bytes: L({ maxTotalBytes: 8 }) });
    expect(codes(a)).toContain("limit-total-size-exceeded");
    expect(exit).toBe(6);
  });
});

describe("T013 — tope global de issues", () => {
  it("muchos errores con maxIssues reducido → un único limit-issues-exceeded, partial, sin superar el tope", async () => {
    const many: Record<string, unknown> = {};
    for (let i = 0; i < 30; i += 1) many[`bad${i}`] = { $type: "weird", $value: "v", $description: "d" };
    // tree por defecto (produce 30 errores); el tope GLOBAL de la tubería (bytes.maxIssues) los acota.
    const { a } = await analyzeWith(many, { bytes: L({ maxIssues: 6 }) });
    const total = a.errors.length + a.warnings.length;
    expect(total).toBeLessThanOrEqual(6);
    expect(a.errors.filter((e) => e.code === "limit-issues-exceeded")).toHaveLength(1);
    expect(a.limits.partial).toBe(true);
  });

  it("determinista: misma entrada ⇒ mismo conjunto/orden de issues", async () => {
    const tokens = { g: { x: { $type: "weird", $value: "v", $description: "d" }, y: { $value: "{g.nope}", $description: "d" } } };
    const a = await analyzeWith(tokens);
    const b = await analyzeWith(tokens);
    expect(codes(a.a)).toEqual(codes(b.a));
  });
});
