import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createSingleFileAtomicWriter } from "../../../src/infrastructure/fs/single-file-atomic-writer.js";

async function tmpRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "neuraz-writer-safety-"));
}

describe("single-file writer path safety", () => {
  it("rejects path escape and absolute targets", async () => {
    const root = await tmpRoot();
    try {
      const writer = createSingleFileAtomicWriter();
      await expect(writer.write({ rootDir: root, relativePath: "../x.json", content: "{}", expectedContent: "{}", createBackup: false })).resolves.toMatchObject({ outcome: "path-error" });
      await expect(writer.write({ rootDir: root, relativePath: path.join(root, "x.json"), content: "{}", expectedContent: "{}", createBackup: false })).resolves.toMatchObject({ outcome: "path-error" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects target symlink, parent symlink and directory target", async () => {
    const root = await tmpRoot();
    const outside = await tmpRoot();
    try {
      await writeFile(path.join(root, "real.json"), "{}\n");
      await symlink(path.join(root, "real.json"), path.join(root, "link.json"));
      await mkdir(path.join(root, "dir"));
      await symlink(outside, path.join(root, "parent-link"));
      const writer = createSingleFileAtomicWriter();

      await expect(writer.write({ rootDir: root, relativePath: "link.json", content: "{}\n", expectedContent: "{}\n", createBackup: false })).resolves.toMatchObject({ outcome: "path-error" });
      await expect(writer.write({ rootDir: root, relativePath: "parent-link/x.json", content: "{}\n", expectedContent: "{}\n", createBackup: false })).resolves.toMatchObject({ outcome: "path-error" });
      await expect(writer.write({ rootDir: root, relativePath: "dir", content: "{}\n", expectedContent: "{}\n", createBackup: false })).resolves.toMatchObject({ outcome: "path-error" });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});
