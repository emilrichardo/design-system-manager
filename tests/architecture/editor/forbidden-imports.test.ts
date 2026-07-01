import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findViolations } from "../../../scripts/arch-guard.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("editor forbidden imports (010 Checkpoint A)", () => {
  it("el código real de src/application/editor respeta las fronteras de 010", async () => {
    const violations = await findViolations(REPO_ROOT);
    const editorViolations = violations.filter((v) => v.file.startsWith("src/application/editor/"));
    expect(editorViolations).toEqual([]);
  });

  it("detecta node:http dentro de application/editor", async () => {
    const root = await mkdtemp(join(tmpdir(), "arch-guard-editor-"));
    try {
      await mkdir(join(root, "src", "application", "editor"), { recursive: true });
      await writeFile(join(root, "src", "application", "editor", "bad.ts"), 'import { createServer } from "node:http";\n');
      const violations = await findViolations(root);
      expect(violations.some((v) => v.msg.includes("node:http"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detecta DOM y puertos de escritura dentro de application/editor", async () => {
    const root = await mkdtemp(join(tmpdir(), "arch-guard-editor-"));
    try {
      await mkdir(join(root, "src", "application", "editor"), { recursive: true });
      await writeFile(
        join(root, "src", "application", "editor", "bad.ts"),
        "export const el = window.document;\nexport interface Bad { readonly port: TokenSourceWriterPort; }\n",
      );
      const violations = await findViolations(root);
      expect(violations.some((v) => v.msg.includes("DOM"))).toBe(true);
      expect(violations.some((v) => v.msg.includes("*Writer"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
