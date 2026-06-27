// T011/T012 (003) — toJsonInspectEnvelope: outcomes recuperables, identidad/confianza, archivos,
// tokens sin cota de 200, not-found contractual, pureza y JSON-safe.
import { describe, expect, it } from "vitest";
import { toJsonInspectEnvelope } from "../../../src/application/json/map-inspect.js";
import type { InspectDesignSystemResult } from "../../../src/application/analysis-ports.js";
import type {
  DesignSystemInspection,
  TokensInspection,
} from "../../../src/domain/analysis/design-system-inspection.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";
import { recovered, unavailable, untrusted, valid } from "../../../src/domain/analysis/inspected-value.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { analysisHost } from "../../helpers/analysis-fixtures.js";
import { deepFreeze, undefinedPaths } from "./json-test-utils.js";

const baseValidation = validationReport({
  structuralState: "complete-valid",
  checkedDocuments: ["neuraz-ds.config.json"],
  uncheckedDocuments: [],
  errors: [],
  warnings: [],
  limits: noLimitsReached,
  tokens: 1,
});

function node(path: string, over: Partial<TokenNodeSummary> = {}): TokenNodeSummary {
  return {
    path,
    declaredType: "color",
    effectiveType: "color",
    typeOrigin: "own",
    typeSourcePath: null,
    kind: "concrete",
    aliasTarget: null,
    aliasState: "n/a",
    description: null,
    depth: 1,
    trust: "valid",
    ...over,
  };
}

function tokens(count: number): TokensInspection {
  const paths = Array.from({ length: count }, (_, i) => node(`color.t${i}`));
  return {
    total: count,
    groups: 1,
    concreteValues: count,
    aliases: 0,
    byType: count > 0 ? { color: count } : {},
    maxDepth: count > 0 ? 2 : 0,
    aliasIssues: 0,
    paths,
  };
}

function inspection(over: Partial<DesignSystemInspection> = {}): DesignSystemInspection {
  return {
    host: { root: "/repo", designSystemPath: "/repo/design-system" },
    structuralState: "complete-valid",
    identity: {
      name: valid("Acme Design System"),
      slug: valid("acme-design-system"),
      version: recovered("0.1.0"),
      // description ausente → unavailable
    },
    schemaVersions: { config: valid("0.1.0"), manifest: valid("0.1.0"), formatVersion: valid("2025.10") },
    files: {
      expected: ["neuraz-ds.config.json", "design-system/design-system.json"],
      present: [{ relativePath: "neuraz-ds.config.json", kind: "file", readable: true }],
      missing: ["design-system/design-system.json"],
    },
    tokens: tokens(2),
    validation: baseValidation,
    limits: noLimitsReached,
    ...over,
  };
}

describe("toJsonInspectEnvelope — recuperables (T011)", () => {
  it("valid: envelope completo, identidad con confianza, sin error", () => {
    const r: InspectDesignSystemResult = { outcome: "valid", host: analysisHost(), inspection: inspection() };
    const env = toJsonInspectEnvelope(r);
    expect(env.formatVersion).toBe("1.0.0");
    expect(env.command).toBe("inspect");
    expect("error" in env).toBe(false);
    if (env.outcome !== "not-found") {
      expect(env.result.identity).toEqual({
        name: { value: "Acme Design System", trust: "valid" },
        slug: { value: "acme-design-system", trust: "valid" },
        version: { value: "0.1.0", trust: "recovered" },
        description: { value: null, trust: "unavailable" },
      });
      expect(env.result.host).toEqual({ root: "/repo", designSystemPath: "/repo/design-system" });
    }
  });

  it("preserva valid/recovered/untrusted/unavailable sin degradar", () => {
    const insp = inspection({
      identity: { name: valid("N"), slug: recovered("s"), version: untrusted("v"), description: unavailable },
    });
    const r: InspectDesignSystemResult = { outcome: "complete-invalid", host: analysisHost(), inspection: insp };
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.identity).toEqual({
        name: { value: "N", trust: "valid" },
        slug: { value: "s", trust: "recovered" },
        version: { value: "v", trust: "untrusted" },
        description: { value: null, trust: "unavailable" },
      });
    }
  });

  it("archivos: expected/present/missing; sizeBytes null intencional en v1", () => {
    const r: InspectDesignSystemResult = { outcome: "partial", host: analysisHost(), inspection: inspection() };
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.files.present).toEqual([
        { relativePath: "neuraz-ds.config.json", kind: "file", sizeBytes: null, readable: true },
      ]);
      expect(env.result.files.missing).toEqual(["design-system/design-system.json"]);
    }
  });

  it("identity/schemaVersions/tokens ausentes → null (no estructura ficticia)", () => {
    const insp = inspection({ identity: undefined, schemaVersions: undefined, tokens: undefined });
    const r: InspectDesignSystemResult = { outcome: "complete-invalid", host: analysisHost(), inspection: insp };
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.identity).toBeNull();
      expect(env.result.schemaVersions).toBeNull();
      expect(env.result.tokens).toBeNull();
    }
  });

  it("estadísticas y byType copiados; validation embebida conserva valid", () => {
    const r: InspectDesignSystemResult = { outcome: "valid", host: analysisHost(), inspection: inspection() };
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.tokens?.byType).toEqual({ color: 2 });
      expect(env.result.tokens?.total).toBe(2);
      expect(env.result.validation.valid).toBe(true);
      expect(env.result.validation.structuralState).toBe("complete-valid");
    }
  });

  it("token paths conservan campos aprobados (alias incluido)", () => {
    const insp = inspection({
      tokens: {
        total: 1,
        groups: 1,
        concreteValues: 0,
        aliases: 1,
        byType: { color: 1 },
        maxDepth: 2,
        aliasIssues: 0,
        paths: [
          node("color.brand.primary", {
            declaredType: null,
            typeOrigin: "alias",
            kind: "alias",
            aliasTarget: "color.base.blue-500",
            aliasState: "valid",
          }),
        ],
      },
    });
    const r: InspectDesignSystemResult = { outcome: "valid", host: analysisHost(), inspection: insp };
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.tokens?.paths[0]).toEqual({
        path: "color.brand.primary",
        declaredType: null,
        effectiveType: "color",
        typeOrigin: "alias",
        typeSourcePath: null,
        kind: "alias",
        aliasTarget: "color.base.blue-500",
        aliasState: "valid",
        description: null,
        depth: 1,
        trust: "valid",
      });
    }
  });
});

describe("toJsonInspectEnvelope — sin cota de 200 (T011)", () => {
  for (const count of [0, 199, 200, 201, 250]) {
    it(`conserva los ${count} paths (paths.length === total)`, () => {
      const r: InspectDesignSystemResult = {
        outcome: "valid",
        host: analysisHost(),
        inspection: inspection({ tokens: tokens(count) }),
      };
      const env = toJsonInspectEnvelope(r);
      if (env.outcome !== "not-found") {
        expect(env.result.tokens?.paths.length).toBe(count);
        expect(env.result.tokens?.total).toBe(count);
      }
    });
  }
});

describe("toJsonInspectEnvelope — not-found (T011)", () => {
  it("con host: result null, error null", () => {
    const r: InspectDesignSystemResult = {
      outcome: "not-found",
      host: analysisHost(),
      inspection: null,
      hostError: null,
    };
    expect(toJsonInspectEnvelope(r)).toEqual({
      formatVersion: "1.0.0",
      command: "inspect",
      outcome: "not-found",
      result: null,
      error: null,
    });
  });

  it("sin host: result null, error null", () => {
    const r: InspectDesignSystemResult = {
      outcome: "not-found",
      host: null,
      inspection: null,
      hostError: { code: "package-json-missing", message: "sin package.json" },
    };
    const env = toJsonInspectEnvelope(r);
    expect(env.result).toBeNull();
    if (env.outcome === "not-found") expect(env.error).toBeNull();
  });
});

describe("toJsonInspectEnvelope — pureza y JSON-safe (T011)", () => {
  const r: InspectDesignSystemResult = { outcome: "valid", host: analysisHost(), inspection: inspection({ tokens: tokens(3) }) };

  it("no muta el input congelado; determinista", () => {
    deepFreeze(r);
    expect(toJsonInspectEnvelope(r)).toEqual(toJsonInspectEnvelope(r));
  });

  it("copias defensivas: byType y paths no comparten referencia con la inspección", () => {
    const env = toJsonInspectEnvelope(r);
    if (env.outcome !== "not-found" && env.result.tokens && r.inspection?.tokens) {
      expect(env.result.tokens.byType).not.toBe(r.inspection.tokens.byType);
      expect(env.result.tokens.paths).not.toBe(r.inspection.tokens.paths);
    }
  });

  it("no contiene undefined en ningún nivel", () => {
    expect(undefinedPaths(toJsonInspectEnvelope(r))).toEqual([]);
  });
});
