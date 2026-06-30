// T148 (006) — `npm pack --dry-run --json`: el tarball incluye `dist/`, el binario `dist/cli/index.js`,
// `presets/` y los recursos runtime; excluye `src/`, `tests/`, `specs/` y `.agents/`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function packedFiles(): string[] {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
  return (JSON.parse(out)[0]?.files ?? []).map((f: { path: string }) => f.path);
}

beforeAll(() => {
  ensureBuilt();
}, 180000);

describe("npm pack — build/export packaging (T148)", () => {
  it("incluye dist/, el binario y presets/, recursos runtime", () => {
    const files = packedFiles();
    expect(files.some((p) => p.startsWith("dist/"))).toBe(true);
    expect(files).toContain("dist/cli/index.js");
    expect(files).toContain("dist/cli/commands/build.js");
    expect(files).toContain("dist/cli/commands/export.js");
    expect(files).toContain("dist/infrastructure/build-export/artifact-set-writer.js");
    expect(files).toContain("presets/catalog.json");
  }, 120000);

  it("el binario declarado en package.json está empaquetado", () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as { bin: Record<string, string> };
    const binPath = pkg.bin["neuraz-ds"];
    expect(binPath).toBe("dist/cli/index.js");
    expect(packedFiles()).toContain(binPath);
  }, 120000);

  it("excluye src/, tests/, specs/ y .agents/", () => {
    const files = packedFiles();
    for (const prefix of ["src/", "tests/", "specs/", ".agents/"]) {
      expect(files.some((p) => p.startsWith(prefix))).toBe(false);
    }
  }, 120000);
});
