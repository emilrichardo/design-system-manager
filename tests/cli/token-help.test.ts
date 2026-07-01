// T039 (008) — Ayuda de `token`: subcomandos válidos presentes; sin `--force` ni flags fuera de alcance;
// los shorthands no ofrecen `--json`. Solo el parser (sin ejecutar casos de uso, sin tokenDeps).
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];

function captured() {
  const o: string[] = [];
  const e: string[] = [];
  return { io: { out: (s: string) => o.push(s), err: (s: string) => e.push(s) }, out: () => o.join(""), err: () => e.join("") };
}

async function help(...args: string[]): Promise<string> {
  const c = captured();
  const code = await runCli({ argv: argv(...args), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
  expect(code).toBe(0);
  return c.out() + c.err();
}

const FORBIDDEN = ["--force", "--category", "--dry-run"];

describe("token help (T039)", () => {
  it("`--help` lista el grupo `token`", async () => {
    expect(await help("--help")).toContain("token");
  });

  it("`token --help` lista plan/apply/create/update/rename/move/remove", async () => {
    const text = await help("token", "--help");
    for (const sub of ["plan", "apply", "create", "update", "rename", "move", "remove"]) expect(text).toContain(sub);
  });

  it("`token plan --help` / `token apply --help` ofrecen `--file` y `--json`, sin flags fuera de alcance", async () => {
    for (const sub of ["plan", "apply"]) {
      const text = await help("token", sub, "--help");
      expect(text).toContain("--file");
      expect(text).toContain("--json");
      for (const flag of FORBIDDEN) expect(text).not.toContain(flag);
    }
  });

  it("los shorthands NO ofrecen `--json` ni `--force`", async () => {
    for (const [sub, args] of [
      ["create", []],
      ["update", []],
      ["rename", []],
      ["move", []],
      ["remove", []],
    ] as const) {
      const text = await help("token", sub, ...args, "--help");
      expect(text).not.toContain("--json");
      expect(text).not.toContain("--force");
    }
  });

  it("`token create --help` / `token update --help` documentan `--type`/`--value`", async () => {
    expect(await help("token", "create", "--help")).toMatch(/--type/);
    expect(await help("token", "create", "--help")).toMatch(/--value/);
    expect(await help("token", "update", "--help")).toMatch(/--value/);
  });

  it("rechaza una opción desconocida en cualquier subcomando (exit 3)", async () => {
    const c = captured();
    const code = await runCli({ argv: argv("token", "plan", "--bogus"), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
    expect(code).toBe(3);
  });
});
