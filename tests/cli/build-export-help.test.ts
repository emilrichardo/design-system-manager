// T143 (006) — Ayuda de `build`/`export`: comandos válidos presentes; flags fuera de alcance ausentes;
// `export` no acepta `--json`. Solo el parser (sin ejecutar casos de uso).
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];

function captured(): { io: { out: (s: string) => void; err: (s: string) => void }; out: () => string; err: () => string } {
  const o: string[] = [];
  const e: string[] = [];
  return { io: { out: (s) => o.push(s), err: (s) => e.push(s) }, out: () => o.join(""), err: () => e.join("") };
}

const FORBIDDEN = ["--output", "--input", "--formats", "--force", "--dry-run", "--cwd", "--clean", "--watch", "--minify"];

async function help(...args: string[]): Promise<string> {
  const c = captured();
  const code = await runCli({ argv: argv(...args), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
  expect(code).toBe(0);
  return c.out() + c.err();
}

describe("build/export help (T143)", () => {
  it("`--help` lista los comandos build y export", async () => {
    const text = await help("--help");
    expect(text).toContain("build");
    expect(text).toContain("export");
  });

  it("`build --help` ofrece `--json` y NINGÚN flag fuera de alcance", async () => {
    const text = await help("build", "--help");
    expect(text).toContain("--json");
    for (const flag of FORBIDDEN) expect(text).not.toContain(flag);
  });

  it("`export --help` lista los formatos y NO acepta `--json` ni flags fuera de alcance", async () => {
    const text = await help("export", "--help");
    expect(text).toMatch(/css/);
    expect(text).toMatch(/json/);
    expect(text).toMatch(/typescript/);
    expect(text).not.toContain("--json");
    for (const flag of FORBIDDEN) expect(text).not.toContain(flag);
  });
});
