// T044 (008) — `npm pack --dry-run --json`: el tarball incluye `dist/cli/commands/token.js` y
// `dist/**/token-mutations/**`; excluye `src/`, `tests/`, `specs/`, `.agents/`.
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

describe("npm pack — token mutations packaging (T044)", () => {
  it("incluye dist/cli/commands/token.js y dist/**/token-mutations/**", () => {
    const files = packedFiles();
    expect(files).toContain("dist/cli/commands/token.js");
    const tokenMutationFiles = files.filter((p) => p.includes("token-mutations/"));
    expect(tokenMutationFiles.length).toBeGreaterThan(0);
    expect(files).toContain("dist/application/token-mutations/apply-token-mutation.js");
    expect(files).toContain("dist/application/token-mutations/plan-token-mutation.js");
    expect(files).toContain("dist/infrastructure/token-mutations/token-source-writer.js");
    expect(files).toContain("dist/application/token-mutations/json/map-mutation.js");
    expect(files).toContain("dist/infrastructure/reporter/token-mutation-terminal-reporter.js");
    expect(files).toContain("dist/infrastructure/reporter/token-mutation-json-reporter.js");
  }, 120000);

  it("excluye src/, tests/, specs/ y .agents/", () => {
    const files = packedFiles();
    for (const prefix of ["src/", "tests/", "specs/", ".agents/"]) {
      expect(files.some((p) => p.startsWith(prefix))).toBe(false);
    }
  }, 120000);
});
