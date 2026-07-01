import { describe, expect, it } from "vitest";
import { composeEditorSessionFromViewer, createEditorDraftForOperation } from "../../../src/application/editor/index.js";
import type { ViewerSessionV1 } from "../../../src/application/viewer/session.js";

describe("editor viewer integration (010 Checkpoint B)", () => {
  it("compone la sesión editorial reutilizando la sesión Viewer por referencia", () => {
    const viewer: ViewerSessionV1 = Object.freeze({
      state: "ready",
      host: Object.freeze({ initialized: true }),
      overview: null,
      navigation: null,
    });
    const editor = composeEditorSessionFromViewer(viewer);

    expect(editor.viewer).toBe(viewer);
    expect(editor.state).toBe("idle");
    expect(editor.draft).toBeNull();
    expect(editor.plan).toBeNull();
  });

  it("mantiene el draft separado de la proyección Viewer original", () => {
    const viewer: ViewerSessionV1 = Object.freeze({
      state: "partial",
      host: Object.freeze({ initialized: true }),
      overview: null,
      navigation: null,
    });
    const draft = createEditorDraftForOperation({ kind: "update-description", path: "color.brand.primary", description: "New description" });
    const editor = composeEditorSessionFromViewer(viewer, { state: "drafting", draft });

    expect(editor.viewer).toBe(viewer);
    expect(editor.viewer.state).toBe("partial");
    expect(editor.draft).toBe(draft);
    expect(editor.draft?.command.operations[0]).toEqual({ kind: "update-description", path: "color.brand.primary", description: "New description" });
  });
});
