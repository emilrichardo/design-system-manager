import { describe, expect, it } from "vitest";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import { createEditorValueControl, draftUpdateValueFromControl, parseEditorValueInput } from "../../../src/application/editor/index.js";

function token(overrides: Partial<ViewerTokenV1>): ViewerTokenV1 {
  return {
    path: "color.brand.primary",
    category: "color",
    level: "semantic",
    levelSource: "path",
    declaredType: "color",
    effectiveType: "color",
    typeOrigin: "own",
    kind: "concrete",
    declaredValue: "#3b82f6",
    resolvedValue: "#3b82f6",
    immediateAliasTarget: null,
    aliasChain: [],
    aliasState: "n/a",
    description: null,
    trust: "valid",
    ...overrides,
  };
}

describe("editor value controls (010 Checkpoint C)", () => {
  it("acepta inputs válidos de tipos soportados", () => {
    expect(parseEditorValueInput({ type: "color", value: "#fff" })).toEqual({ ok: true, value: "#fff" });
    expect(parseEditorValueInput({ type: "number", value: "12.5" })).toEqual({ ok: true, value: 12.5 });
    expect(parseEditorValueInput({ type: "dimension", value: 16, unit: "px" })).toEqual({ ok: true, value: { value: 16, unit: "px" } });
    expect(parseEditorValueInput({ type: "fontFamily", value: "Inter" })).toEqual({ ok: true, value: "Inter" });
    expect(parseEditorValueInput({ type: "fontWeight", value: "700" })).toEqual({ ok: true, value: 700 });
    expect(parseEditorValueInput({ type: "duration", value: "120", unit: "ms" })).toEqual({ ok: true, value: { value: 120, unit: "ms" } });
    expect(parseEditorValueInput({ type: "cubicBezier", x1: 0.2, y1: 0, x2: 0.4, y2: 1 })).toEqual({ ok: true, value: [0.2, 0, 0.4, 1] });
    expect(parseEditorValueInput({ type: "string", value: "label" })).toEqual({ ok: true, value: "label" });
    expect(parseEditorValueInput({ type: "boolean", value: true })).toEqual({ ok: true, value: true });
  });

  it("bloquea inputs inválidos y crea drafts inválidos sin ejecutar nada", () => {
    expect(parseEditorValueInput({ type: "dimension", value: "x", unit: "px" })).toMatchObject({ ok: false, code: "invalid-dimension" });
    expect(parseEditorValueInput({ type: "duration", value: -1, unit: "ms" })).toMatchObject({ ok: false, code: "invalid-duration" });
    expect(parseEditorValueInput({ type: "cubicBezier", x1: 2, y1: 0, x2: 0.4, y2: 1 })).toMatchObject({ ok: false, code: "invalid-cubic-bezier" });

    const draft = draftUpdateValueFromControl("color.brand.primary", { type: "number", value: "not-a-number" });
    expect(draft.state).toBe("invalid");
    expect(draft.controlErrors[0]).toMatchObject({ field: "value", code: "invalid-number" });
  });

  it("expone estados read-only para aliases, composites y tipos no soportados", () => {
    expect(createEditorValueControl(token({ immediateAliasTarget: "color.base.blue-500" }))).toMatchObject({ state: "read-only-alias", type: "color" });
    expect(createEditorValueControl(token({ declaredType: "typography", effectiveType: "typography", declaredValue: {} }))).toMatchObject({ state: "composite", type: null });
    expect(createEditorValueControl(token({ declaredType: "asset", effectiveType: "asset" }))).toMatchObject({ state: "unsupported", type: null });
  });
});
