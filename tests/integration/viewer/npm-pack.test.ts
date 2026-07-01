// T052 (009) — `npm pack --dry-run --json`: incluye `dist/cli/commands/view.js`,
// `dist/infrastructure/viewer/**` (incluido el bundle estático compilado `ui/main.js`) y
// `dist/application/viewer/**`; excluye `src/`, `tests/`, `specs/`, `.agents/`.
import { execFileSync } from "node:child_process";
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

describe("npm pack — viewer packaging (T052)", () => {
  it("incluye dist/cli/commands/view.js y dist/application/viewer/**", () => {
    const files = packedFiles();
    expect(files).toContain("dist/cli/commands/view.js");
    const applicationViewerFiles = files.filter((p) => p.startsWith("dist/application/viewer/"));
    expect(applicationViewerFiles.length).toBeGreaterThan(0);
    expect(files).toContain("dist/application/viewer/build-session.js");
    expect(files).toContain("dist/application/viewer/build-section-detail.js");
    expect(files).toContain("dist/application/viewer/contrast.js");
  }, 120000);

  it("incluye dist/infrastructure/viewer/** incluido el bundle estático compilado ui/main.js", () => {
    const files = packedFiles();
    expect(files).toContain("dist/infrastructure/viewer/http-server.js");
    expect(files).toContain("dist/infrastructure/viewer/ui/main.js");
  }, 120000);

  it("excluye src/, tests/, specs/ y .agents/", () => {
    const files = packedFiles();
    for (const prefix of ["src/", "tests/", "specs/", ".agents/"]) {
      expect(files.some((p) => p.startsWith(prefix))).toBe(false);
    }
  }, 120000);
});
