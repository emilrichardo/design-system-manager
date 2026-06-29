import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPresetTargetReader, createSingleFileAtomicWriter } from "../../../src/infrastructure/fs/single-file-atomic-writer.js";

async function tmpRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "neuraz-writer-"));
}

describe("single-file atomic writer", () => {
  it("writes through a same-directory temp, creates backup, and leaves no orphan temps", async () => {
    const root = await tmpRoot();
    try {
      await writeFile(path.join(root, "base.tokens.json"), "{\"a\":1}\n");
      const writer = createSingleFileAtomicWriter();
      const result = await writer.write({
        rootDir: root,
        relativePath: "base.tokens.json",
        content: "{\n  \"a\": 2\n}\n",
        expectedContent: "{\"a\":1}\n",
        createBackup: true,
      });

      expect(result).toMatchObject({ outcome: "written", wrote: true, backupRelativePath: "base.tokens.json.bak" });
      expect(await readFile(path.join(root, "base.tokens.json"), "utf8")).toBe("{\n  \"a\": 2\n}\n");
      expect(await readFile(path.join(root, "base.tokens.json.bak"), "utf8")).toBe("{\"a\":1}\n");
      expect((await readdir(root)).filter((entry) => entry.includes(".tmp"))).toEqual([]);

      expect(await writer.cleanupBackup(root, "base.tokens.json.bak")).toEqual({ ok: true, error: null });
      expect(await readdir(root)).toEqual(["base.tokens.json"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("detects concurrent modification by content hash before rename and preserves target", async () => {
    const root = await tmpRoot();
    try {
      await writeFile(path.join(root, "base.tokens.json"), "{\"a\":2}\n");
      const result = await createSingleFileAtomicWriter().write({
        rootDir: root,
        relativePath: "base.tokens.json",
        content: "{\"a\":3}\n",
        expectedContent: "{\"a\":1}\n",
        createBackup: true,
      });

      expect(result.outcome).toBe("concurrent-modification");
      expect(result.wrote).toBe(false);
      expect(await readFile(path.join(root, "base.tokens.json"), "utf8")).toBe("{\"a\":2}\n");
      expect(await readdir(root)).toEqual(["base.tokens.json"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("classifies missing target before rename as before-rename-error", async () => {
    const root = await tmpRoot();
    try {
      const result = await createSingleFileAtomicWriter().write({
        rootDir: root,
        relativePath: "base.tokens.json",
        content: "{}\n",
        expectedContent: "{}\n",
        createBackup: true,
      });

      expect(result.outcome).toBe("before-rename-error");
      expect((await readdir(root)).filter((entry) => entry.includes(".tmp"))).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("target reader reads existing files and reports not-found without throwing", async () => {
    const root = await tmpRoot();
    try {
      await writeFile(path.join(root, "tokens.json"), "{}\n");
      const reader = createPresetTargetReader();
      await expect(reader.read({ rootDir: root, relativePath: "tokens.json" })).resolves.toEqual({ outcome: "success", content: "{}\n" });
      await expect(reader.read({ rootDir: root, relativePath: "missing.json" })).resolves.toMatchObject({ outcome: "not-found", content: null });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
