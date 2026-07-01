// T005 (011) — Reglas R1-R5 de contracts/token-layer-policy.md.
import { describe, expect, it } from "vitest";
import {
  TOKEN_LAYERS,
  emptyTokenLayer,
  evaluateAliasLayerTransition,
  isTokenLayer,
  unclassifiedLayerWarning,
  validateTokenLayerShape,
} from "../../../src/domain/token-mutations/token-layer.js";

describe("TokenLayer", () => {
  it("reconoce exactamente 3 capas", () => {
    expect(TOKEN_LAYERS).toEqual(["primitive", "semantic", "component"]);
    expect(isTokenLayer("component")).toBe(true);
    expect(isTokenLayer("brand")).toBe(false);
  });
});

describe("R1 - una sola layer, brandRole solo sobre primitive", () => {
  it("acepta brandRole:brand con layer:primitive", () => {
    const issues = validateTokenLayerShape({ ...emptyTokenLayer(), layer: "primitive", brandRole: "brand" }, "color.brand.primary");
    expect(issues).toHaveLength(0);
  });
  it("rechaza brandRole:brand con layer:semantic (conflicto)", () => {
    const issues = validateTokenLayerShape({ ...emptyTokenLayer(), layer: "semantic", brandRole: "brand" }, "x");
    expect(issues.some((i) => i.code === "token-layer-brand-role-conflict")).toBe(true);
  });
});

describe("R3 - layer nunca se infiere del path", () => {
  it("value=null (sin metadata) no produce error de forma", () => {
    expect(validateTokenLayerShape(null, "color.brand.primary")).toHaveLength(0);
  });
  it("layer invalida produce error explicito", () => {
    const issues = validateTokenLayerShape({ layer: "invalid-layer" as never }, "x");
    expect(issues.some((i) => i.code === "token-layer-invalid")).toBe(true);
  });
});

describe("R4 - ausencia de layer nunca invalida, solo advierte", () => {
  it("token sin metadata -> warning token-layer-unclassified", () => {
    const w = unclassifiedLayerWarning(null, "color.base.blue-500");
    expect(w?.code).toBe("token-layer-unclassified");
  });
  it("token con layer declarada -> sin warning", () => {
    const w = unclassifiedLayerWarning({ ...emptyTokenLayer(), layer: "primitive" }, "x");
    expect(w).toBeNull();
  });
});

describe("R2 - component nunca alias directo a primitive (bypass de semantic)", () => {
  it("component -> semantic: sin warning", () => {
    const from = { ...emptyTokenLayer(), layer: "component" as const };
    const to = { ...emptyTokenLayer(), layer: "semantic" as const };
    expect(evaluateAliasLayerTransition("component.button.bg", from, to)).toBeNull();
  });
  it("component -> primitive: warning component-token-bypasses-semantic", () => {
    const from = { ...emptyTokenLayer(), layer: "component" as const };
    const to = { ...emptyTokenLayer(), layer: "primitive" as const };
    const issue = evaluateAliasLayerTransition("component.button.bg", from, to);
    expect(issue?.code).toBe("component-token-bypasses-semantic");
  });
  it("component -> primitive con brandRole:brand: warning brand-token-bypasses-semantic", () => {
    const from = { ...emptyTokenLayer(), layer: "component" as const };
    const to = { ...emptyTokenLayer(), layer: "primitive" as const, brandRole: "brand" as const };
    const issue = evaluateAliasLayerTransition("component.button.bg", from, to);
    expect(issue?.code).toBe("brand-token-bypasses-semantic");
  });
  it("primitive -> primitive: nunca aplica esta regla (from no es component)", () => {
    const from = { ...emptyTokenLayer(), layer: "primitive" as const };
    const to = { ...emptyTokenLayer(), layer: "primitive" as const };
    expect(evaluateAliasLayerTransition("color.brand.hover", from, to)).toBeNull();
  });
});

describe("R5 - campos component/part/variant/state/size solo se leen cuando layer=component", () => {
  it("emptyTokenLayer no fuerza ningun campo de componente", () => {
    const layer = emptyTokenLayer();
    expect(layer.component).toBeNull();
    expect(layer.part).toBeNull();
    expect(layer.variant).toBeNull();
    expect(layer.state).toBeNull();
    expect(layer.size).toBeNull();
  });
});
