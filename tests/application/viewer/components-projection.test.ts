import { describe, expect, it } from "vitest";
import { projectComponents, type ViewerComponentGroupV1 } from "../../../src/application/viewer/components.js";
import { emptyTokenLayer } from "../../../src/domain/token-mutations/token-layer.js";
import type { TokenLayerV1 } from "../../../src/domain/token-mutations/token-layer.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";

function layer(layer: Partial<TokenLayerV1>): TokenLayerV1 {
  return Object.freeze({ ...emptyTokenLayer(), ...layer });
}

function token(path: string, overrides: Partial<ViewerTokenV1> = {}): ViewerTokenV1 {
  return {
    path,
    category: "color",
    level: "component",
    levelSource: "token",
    declaredType: "color",
    effectiveType: "color",
    typeOrigin: "own",
    kind: "concrete",
    declaredValue: "#000",
    resolvedValue: "#000",
    immediateAliasTarget: null,
    aliasChain: [],
    aliasState: "n/a",
    description: null,
    trust: "valid",
    ...overrides,
  };
}

describe("projectComponents (T023)", () => {
  it("sin tokens component → lista vacía", () => {
    const groups = projectComponents({ layersByPath: new Map(), tokensByPath: new Map() });
    expect(groups).toEqual([]);
  });

  it("tokens sin layer component no aparecen (no son component tokens)", () => {
    const layersByPath = new Map<string, TokenLayerV1 | null>([
      ["color.base.blue", layer({ layer: "primitive" })],
      ["color.semantic.action", layer({ layer: "semantic" })],
    ]);
    const tokensByPath = new Map<string, ViewerTokenV1>([
      ["color.base.blue", token("color.base.blue", { level: "primitive" })],
      ["color.semantic.action", token("color.semantic.action", { level: "semantic" })],
    ]);
    const groups = projectComponents({ layersByPath, tokensByPath });
    expect(groups).toEqual([]);
  });

  it("agrupa por component y construye matrices variant-state/size-variant/part-property declaradas", () => {
    const layersByPath = new Map<string, TokenLayerV1 | null>([
      ["button.container.background.default", layer({ layer: "component", component: "button", part: "container", variant: "default", state: "rest", property: "background" })],
      ["button.container.background.hover", layer({ layer: "component", component: "button", part: "container", variant: "default", state: "hover", property: "background" })],
      ["button.label.color.default", layer({ layer: "component", component: "button", part: "label", variant: "default", state: "rest", property: "color" })],
      ["button.container.background.primary.large", layer({ layer: "component", component: "button", part: "container", variant: "primary", size: "large", property: "background" })],
    ]);
    const tokensByPath = new Map<string, ViewerTokenV1>([
      ["button.container.background.default", token("button.container.background.default")],
      ["button.container.background.hover", token("button.container.background.hover")],
      ["button.label.color.default", token("button.label.color.default")],
      ["button.container.background.primary.large", token("button.container.background.primary.large")],
    ]);
    const groups = projectComponents({ layersByPath, tokensByPath });
    expect(groups).toHaveLength(1);
    const button: ViewerComponentGroupV1 = groups[0]!;
    expect(button.component).toBe("button");
    expect(button.parts).toEqual(["container", "label"]);
    expect([...button.variants].sort()).toEqual(["default", "primary"]);
    expect([...button.states].sort()).toEqual(["hover", "rest"]);
    expect(button.sizes).toEqual(["large"]);
    expect(button.tokens).toHaveLength(4);
    const matrixKinds = button.matrices.map((matrix) => matrix.kind).sort();
    expect(matrixKinds).toContain("variant-state");
    expect(matrixKinds).toContain("size-variant");
    expect(matrixKinds).toContain("part-property");
    const variantState = button.matrices.find((matrix) => matrix.kind === "variant-state")!;
    const hoverCell = variantState.cells.find((cell) => cell.row === "default" && cell.column === "hover");
    expect(hoverCell?.paths).toEqual(["button.container.background.hover"]);
  });

  it("component tokens sin component declarado se agrupan bajo (unspecified) sin fallar", () => {
    const layersByPath = new Map<string, TokenLayerV1 | null>([
      ["x.y.z", layer({ layer: "component", component: null, part: "p" })],
    ]);
    const tokensByPath = new Map<string, ViewerTokenV1>([["x.y.z", token("x.y.z")]]);
    const groups = projectComponents({ layersByPath, tokensByPath });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.component).toBe("(unspecified)");
  });

  it("el orden de los grupos es determinista (por nombre de componente)", () => {
    const layersByPath = new Map<string, TokenLayerV1 | null>([
      ["z.token", layer({ layer: "component", component: "zebra" })],
      ["a.token", layer({ layer: "component", component: "alpha" })],
    ]);
    const tokensByPath = new Map<string, ViewerTokenV1>([
      ["z.token", token("z.token")],
      ["a.token", token("a.token")],
    ]);
    const groups = projectComponents({ layersByPath, tokensByPath });
    expect(groups.map((group) => group.component)).toEqual(["alpha", "zebra"]);
  });
});
