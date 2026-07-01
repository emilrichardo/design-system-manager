// T013 (008) — Candidate builder: create/update/duplicate/remove/group sobre el modelo; preserva
// `$extensions` desconocidos y orden; no muta la entrada; alias y metadata Neuraz.
import { describe, expect, it } from "vitest";
import { buildCandidateDocument } from "../../../src/application/token-mutations/candidate-builder.js";
import { getNode, tokenSummaryMap, type PlainDoc } from "../../../src/application/token-mutations/document-model.js";

function baseDoc(): PlainDoc {
  return {
    color: {
      brand: {
        500: { $type: "color", $value: "#3b82f6", $extensions: { "com.unknown": { keep: true } } },
      },
    },
  };
}

describe("buildCandidateDocument (T013)", () => {
  it("no muta la entrada (clona)", () => {
    const doc = baseDoc();
    const snapshot = JSON.stringify(doc);
    buildCandidateDocument(doc, [{ kind: "remove-token", path: "color.brand.500" }]);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("create-token con type/description/category Neuraz", () => {
    const out = buildCandidateDocument(baseDoc(), [
      { kind: "create-token", path: "color.brand.600", value: "#1d4ed8", type: "color", description: "darker", category: "primitive" },
    ]);
    const node = getNode(out, "color.brand.600") as PlainDoc;
    expect(node.$type).toBe("color");
    expect(node.$value).toBe("#1d4ed8");
    expect(node.$description).toBe("darker");
    expect((node.$extensions as PlainDoc)["ar.neuraz.design-system-manager"]).toEqual({ category: "primitive" });
  });

  it("update-value/type/description y preserva $extensions desconocidos", () => {
    const out = buildCandidateDocument(baseDoc(), [
      { kind: "update-value", path: "color.brand.500", value: "#000000" },
      { kind: "update-type", path: "color.brand.500", type: "color" },
      { kind: "update-description", path: "color.brand.500", description: "ink" },
    ]);
    const node = getNode(out, "color.brand.500") as PlainDoc;
    expect(node.$value).toBe("#000000");
    expect(node.$description).toBe("ink");
    expect((node.$extensions as PlainDoc)["com.unknown"]).toEqual({ keep: true }); // desconocido preservado
  });

  it("update-foundation-level escribe y limpia metadata foundation preservando extensiones ajenas", () => {
    const classified = buildCandidateDocument(baseDoc(), [
      { kind: "update-foundation-level", path: "color.brand.500", level: "primitive" },
    ]);
    const node = getNode(classified, "color.brand.500") as PlainDoc;
    expect((node.$extensions as PlainDoc)["com.unknown"]).toEqual({ keep: true });
    expect((node.$extensions as PlainDoc)["ar.neuraz.design-system-manager"]).toEqual({ foundation: { level: "primitive" } });

    const cleaned = buildCandidateDocument(classified, [
      { kind: "update-foundation-level", path: "color.brand.500", level: null },
    ]);
    const cleanedNode = getNode(cleaned, "color.brand.500") as PlainDoc;
    expect((cleanedNode.$extensions as PlainDoc)["com.unknown"]).toEqual({ keep: true });
    expect((cleanedNode.$extensions as PlainDoc)["ar.neuraz.design-system-manager"]).toEqual({});
  });

  it("set-alias escribe {target}; remove-alias inlina el valor resuelto", () => {
    const out = buildCandidateDocument(baseDoc(), [
      { kind: "create-token", path: "color.accent", value: "{color.brand.500}", type: "color" },
      { kind: "set-alias", path: "color.accent", target: "color.brand.500" },
    ]);
    expect((getNode(out, "color.accent") as PlainDoc).$value).toBe("{color.brand.500}");

    const inlined = buildCandidateDocument(out, [{ kind: "remove-alias", path: "color.accent" }], { resolveValue: () => "#3b82f6" });
    expect((getNode(inlined, "color.accent") as PlainDoc).$value).toBe("#3b82f6");
  });

  it("duplicate-token clona el nodo en el destino", () => {
    const out = buildCandidateDocument(baseDoc(), [{ kind: "duplicate-token", path: "color.brand.500", destinationPath: "color.brand.copy" }]);
    expect(tokenSummaryMap(out).has("color.brand.copy")).toBe(true);
  });

  it("create-group y remove-empty-group", () => {
    const created = buildCandidateDocument(baseDoc(), [{ kind: "create-group", path: "spacing", description: "scale" }]);
    expect(getNode(created, "spacing")).toEqual({ $description: "scale" });
    const removed = buildCandidateDocument(created, [{ kind: "remove-empty-group", path: "spacing" }]);
    expect(getNode(removed, "spacing")).toBeUndefined();
  });

  it("rename-token mueve el nodo a su nuevo nombre", () => {
    const out = buildCandidateDocument(baseDoc(), [{ kind: "rename-token", path: "color.brand.500", newName: "primary" }]);
    expect(tokenSummaryMap(out).has("color.brand.primary")).toBe(true);
    expect(tokenSummaryMap(out).has("color.brand.500")).toBe(false);
  });
});
