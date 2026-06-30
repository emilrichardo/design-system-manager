// T046 (007) — Ayuda de `asset`: subcomandos válidos presentes; sin flags fuera de alcance; `import` con
// `plan`/`apply`. Solo el parser (sin ejecutar casos de uso).
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];
const FORBIDDEN = ["--output", "--input", "--formats", "--force", "--dry-run", "--cwd", "--clean", "--watch", "--minify", "--optimize", "--convert"];

function captured(): { io: { out: (s: string) => void; err: (s: string) => void }; text: () => string } {
  const o: string[] = [];
  return { io: { out: (s) => o.push(s), err: (s) => o.push(s) }, text: () => o.join("") };
}
async function help(...args: string[]): Promise<string> {
  const c = captured();
  const code = await runCli({ argv: argv(...args), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
  expect(code).toBe(0);
  return c.text();
}

describe("asset help (T046)", () => {
  it("`asset --help` lista list/inspect/import/remove", async () => {
    const text = await help("asset", "--help");
    for (const sub of ["list", "inspect", "import", "remove"]) expect(text).toContain(sub);
  });

  it("`asset import --help` ofrece plan y apply", async () => {
    const text = await help("asset", "import", "--help");
    expect(text).toContain("plan");
    expect(text).toContain("apply");
  });

  it("ningún subcomando expone flags fuera de alcance", async () => {
    for (const args of [["asset", "list", "--help"], ["asset", "import", "plan", "--help"], ["asset", "import", "apply", "--help"], ["asset", "remove", "--help"]]) {
      const text = await help(...args);
      for (const flag of FORBIDDEN) expect(text).not.toContain(flag);
    }
  });

  it("`asset import apply --help` ofrece `--license` y NO `--json`", async () => {
    const text = await help("asset", "import", "apply", "--help");
    expect(text).toContain("--license");
    expect(text).not.toContain("--json");
  });
});
