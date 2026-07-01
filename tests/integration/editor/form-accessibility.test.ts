import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("editor form accessibility (010 Checkpoint C)", () => {
  it("declara labels, estado vivo, preview enfocable y formularios keyboard-only", async () => {
    const source = await readFile(new URL("../../../src/infrastructure/viewer/ui/main.ts", import.meta.url), "utf8");

    for (const label of [
      "Token path",
      "Value type",
      "Value",
      "Unit for dimension or duration",
      "Boolean value",
      "Declared type",
      "Description",
      "Neuraz category metadata",
      "Alias target path",
      "New name, parent or destination path",
    ]) {
      expect(source).toContain(label);
    }

    expect(source).toContain('aria-live", "polite"');
    expect(source).toContain('aria-label", "Editor draft JSON"');
    expect(source).toContain("output.focus()");
    expect(source).toContain("event.preventDefault()");
    expect(source).not.toContain("dragstart");
    expect(source).not.toContain("ondrop");
  });

  it("incluye las acciones visuales de valor, alias, metadata, token y grupo sin apply", async () => {
    const source = await readFile(new URL("../../../src/infrastructure/viewer/ui/main.ts", import.meta.url), "utf8");
    for (const kind of [
      "update-value",
      "update-type",
      "update-description",
      "update-category",
      "set-alias",
      "remove-alias",
      "create-token",
      "rename-token",
      "move-token",
      "duplicate-token",
      "remove-token",
      "create-group",
      "rename-group",
      "move-group",
      "remove-empty-group",
    ]) {
      expect(source).toContain(kind);
    }
    expect(source).not.toContain("applyTokenMutation");
    expect(source).not.toContain("/api/editor/apply");
  });
});
