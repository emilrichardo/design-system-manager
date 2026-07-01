// T008 (009) — Cada `ViewerXxxV1` cumple la null policy y las exclusiones de `data-model.md` (sin
// bytes/rutas absolutas/`Error`/secrets), usando fixtures construidos a mano (sin sesión real todavía).
import { describe, expect, it } from "vitest";
import type { ViewerSessionV1 } from "../../../src/application/viewer/session.js";
import { deriveEmptyState, mapAnalysisOutcomeToViewerState } from "../../../src/application/viewer/session.js";
import type { ViewerOverviewV1 } from "../../../src/application/viewer/overview.js";
import type { ViewerNavigationV1 } from "../../../src/application/viewer/navigation.js";
import { VIEWER_SECTION_ORDER } from "../../../src/application/viewer/navigation.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import type { ViewerFoundationV1 } from "../../../src/application/viewer/foundation.js";
import type { ViewerIssueV1 } from "../../../src/application/viewer/issue.js";
import type { ViewerColorV1 } from "../../../src/application/viewer/color.js";
import type { ViewerTypographyV1 } from "../../../src/application/viewer/typography.js";
import type { ViewerAliasV1 } from "../../../src/application/viewer/alias.js";
import type { ViewerAssetV1 } from "../../../src/application/viewer/asset.js";

const NO_ABSOLUTE_PATH = /^(?!\/)(?![A-Za-z]:\\).*$/;

function assertNoForbiddenKeys(value: unknown, path = "$"): void {
  if (value === null || typeof value !== "object") return;
  if (value instanceof Error) throw new Error(`Forbidden Error instance at ${path}`);
  if (value instanceof Uint8Array) throw new Error(`Forbidden raw bytes at ${path}`);
  for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
    const forbidden = ["stack", "mtime", "fd", "inode", "pid", "cwd", "hostname", "username"];
    if (forbidden.includes(key)) throw new Error(`Forbidden field "${key}" at ${path}`);
    assertNoForbiddenKeys(sub, `${path}.${key}`);
  }
}

const token: ViewerTokenV1 = Object.freeze({
  path: "color.brand.primary",
  category: "color",
  level: "primitive",
  levelSource: "token",
  declaredType: "color",
  effectiveType: "color",
  typeOrigin: "own",
  kind: "concrete",
  declaredValue: "#ff0000",
  resolvedValue: "#ff0000",
  immediateAliasTarget: null,
  aliasChain: [],
  aliasState: "n/a",
  description: null,
  trust: "valid",
});

describe("Viewer contract shapes (T008)", () => {
  it("mapAnalysisOutcomeToViewerState projects every 002 outcome without inventing states", () => {
    expect(mapAnalysisOutcomeToViewerState("valid")).toBe("ready");
    expect(mapAnalysisOutcomeToViewerState("complete-invalid")).toBe("invalid-design-system");
    expect(mapAnalysisOutcomeToViewerState("partial")).toBe("partial");
    expect(mapAnalysisOutcomeToViewerState("not-found")).toBe("not-found");
    expect(mapAnalysisOutcomeToViewerState("read-error")).toBe("read-error");
  });

  it("deriveEmptyState only downgrades ready with zero tokens/assets/presets", () => {
    expect(deriveEmptyState("ready", { tokensTotal: 0, assetsTotal: 0, presetsTotal: 0 })).toBe("empty");
    expect(deriveEmptyState("ready", { tokensTotal: 1, assetsTotal: 0, presetsTotal: 0 })).toBe("ready");
    expect(deriveEmptyState("partial", { tokensTotal: 0, assetsTotal: 0, presetsTotal: 0 })).toBe("partial");
    expect(deriveEmptyState("not-found", { tokensTotal: 0, assetsTotal: 0, presetsTotal: 0 })).toBe("not-found");
  });

  it("ViewerNavigationV1 has exactly the 14 canonical sections in fixed order", () => {
    expect(VIEWER_SECTION_ORDER).toHaveLength(14);
    const navigation: ViewerNavigationV1 = {
      sections: VIEWER_SECTION_ORDER.map((id) => ({ id, count: 0, state: "ready" })),
    };
    expect(navigation.sections.map((s) => s.id)).toEqual([...VIEWER_SECTION_ORDER]);
  });

  it("ViewerSessionV1 has null overview/navigation only for not-found/read-error", () => {
    const notFound: ViewerSessionV1 = {
      state: "not-found",
      host: { initialized: false },
      overview: null,
      navigation: null,
    };
    expect(notFound.overview).toBeNull();
    expect(notFound.navigation).toBeNull();
    assertNoForbiddenKeys(notFound);
  });

  it("ViewerOverviewV1 fixture has no forbidden fields and safe paths", () => {
    const overview: ViewerOverviewV1 = {
      validation: { state: "ready", errorCount: 0, warningCount: 0 },
      tokens: { total: 1, primitive: 1, semantic: 0, unclassified: 0 },
      groups: { total: 0 },
      aliases: { total: 0, valid: 0, broken: 0 },
      foundations: { categories: { absent: 0, partial: 0, complete: 1, invalid: 0 } },
      assets: { totalAssets: 0, byKind: { font: 0, logo: 0, svg: 0, icon: 0, image: 0 }, totalByteLength: 0 },
      presets: { total: 0, outcome: "success" },
      issues: { total: 0 },
      build: { hasBuild: false, formats: [], stale: false },
    };
    assertNoForbiddenKeys(overview);
    expect(NO_ABSOLUTE_PATH.test(token.path)).toBe(true);
  });

  it("ViewerFoundationV1/ViewerIssueV1 fixtures carry no bytes/Error/absolute paths", () => {
    const issue: ViewerIssueV1 = { source: "foundations", code: "foundation-level-invalid", path: token.path, severity: "warning", message: "safe message" };
    const foundation: ViewerFoundationV1 = {
      id: "color",
      state: "complete",
      counts: { total: 1, primitive: 1, semantic: 0, unclassified: 0 },
      tokens: [token],
      issues: [issue],
    };
    assertNoForbiddenKeys(foundation);
  });

  it("ViewerColorV1/ViewerTypographyV1 fixtures respect null policy for absent sub-fields", () => {
    const color: ViewerColorV1 = { token, swatch: { resolvedValue: "#ff0000", sRgb: { r: 255, g: 0, b: 0 } }, contrast: null };
    const typography: ViewerTypographyV1 = {
      token,
      family: null,
      weight: null,
      style: null,
      size: null,
      lineHeight: null,
      letterSpacing: null,
      linkedFontAsset: null,
      licenseState: "no-matching-asset",
    };
    assertNoForbiddenKeys(color);
    assertNoForbiddenKeys(typography);
    expect(typography.family).toBeNull();
  });

  it("ViewerAliasV1/ViewerAssetV1 fixtures never carry raw bytes", () => {
    const alias: ViewerAliasV1 = {
      path: token.path,
      origin: { kind: "concrete" },
      immediateTarget: null,
      chain: [],
      dependents: [],
      state: "n/a",
      impactPreview: null,
    };
    const asset: ViewerAssetV1 = {
      logicalPath: "fonts/brand.woff2",
      kind: "font",
      mimeType: "font/woff2",
      byteLength: 1024,
      contentHash: "a".repeat(64),
      dimensions: null,
      provenance: { kind: "local-import", sourceRef: "brand.woff2" },
      license: { status: "unspecified", identifier: null, notice: null },
      sanitization: null,
      ownership: { state: "trusted" },
      issues: [],
    };
    assertNoForbiddenKeys(alias);
    assertNoForbiddenKeys(asset);
  });
});
