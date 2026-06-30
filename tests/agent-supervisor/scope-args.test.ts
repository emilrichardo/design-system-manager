// Scope (globs + drift) y parser de argumentos (anti-inyección/ambigüedad).
import { describe, expect, it } from "vitest";
import { globToRegExp, computeScopeDrift, resolveAllowedGlobs } from "../../scripts/agent/lib/scope.mjs";
import { parseArgs } from "../../scripts/agent/lib/args.mjs";

describe("scope", () => {
  it("globToRegExp soporta * y **", () => {
    expect(globToRegExp("src/*.ts").test("src/a.ts")).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/sub/a.ts")).toBe(false);
    expect(globToRegExp("src/**").test("src/sub/a.ts")).toBe(true);
  });

  it("sin globs (null) no hay deriva", () => {
    expect(computeScopeDrift(["x", "y"], null)).toEqual([]);
  });

  it("deriva = archivos cambiados fuera de los globs; exime alwaysAllow", () => {
    const drift = computeScopeDrift(["src/a.ts", "other/b.ts", "tasks.md"], ["src/**"], { alwaysAllow: ["tasks.md"] });
    expect(drift).toEqual(["other/b.ts"]);
  });

  it("resolveAllowedGlobs prioriza paths explícitos > config > null", () => {
    expect(resolveAllowedGlobs({ feature: "f", explicitPaths: ["a/**"] })).toEqual(["a/**"]);
    expect(resolveAllowedGlobs({ feature: "f", config: { scope: { f: { B: ["b/**"] } } }, checkpoint: "B" })).toEqual(["b/**"]);
    expect(resolveAllowedGlobs({ feature: "f", config: { scope: { f: { "*": ["c/**"] } } }, checkpoint: "Z" })).toEqual(["c/**"]);
    expect(resolveAllowedGlobs({ feature: "f" })).toBeNull();
  });
});

describe("parseArgs", () => {
  it("parsea flags de valor, booleanos y repetibles", () => {
    const a = parseArgs(["--feature", "006", "--checkpoint", "L", "--json", "--path", "src/**", "--path", "x/**"]);
    expect(a.feature).toBe("006");
    expect(a.checkpoint).toBe("L");
    expect(a.json).toBe(true);
    expect(a.paths).toEqual(["src/**", "x/**"]);
  });

  it("soporta --flag=value", () => {
    expect(parseArgs(["--feature=006-build-export"]).feature).toBe("006-build-export");
  });

  it("rechaza argumentos ambiguos/desconocidos (anti command-injection en flags)", () => {
    expect(() => parseArgs(["--feature"])).toThrow(/Falta valor/);
    expect(() => parseArgs(["; rm -rf /"])).toThrow(/no reconocido/i);
    expect(() => parseArgs(["--bogus"])).toThrow(/no reconocido/i);
  });
});
