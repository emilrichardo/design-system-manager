// Resolución de feature: validación de nombre (anti-traversal), feature/tasks.md inexistentes.
import { describe, expect, it, afterEach } from "vitest";
import { validateFeatureName, resolveFeature } from "../../scripts/agent/lib/feature.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => {
  repos.splice(0).forEach((r) => r.cleanup());
});
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}

describe("validateFeatureName", () => {
  it("acepta nombres válidos", () => {
    expect(validateFeatureName("006-build-export")).toBe("006-build-export");
  });

  it("rechaza traversal y separadores", () => {
    expect(() => validateFeatureName("../etc")).toThrow();
    expect(() => validateFeatureName("a/b")).toThrow();
    expect(() => validateFeatureName("a\\b")).toThrow();
    expect(() => validateFeatureName("..")).toThrow();
    expect(() => validateFeatureName("")).toThrow();
  });
});

describe("resolveFeature", () => {
  it("resuelve una feature existente con tasks.md", () => {
    const r = repo();
    const resolved = resolveFeature(r.feature, r.dir);
    expect(resolved.relTasksPath).toBe(`specs/${r.feature}/tasks.md`);
  });

  it("falla si la feature no existe", () => {
    const r = repo();
    expect(() => resolveFeature("999-missing", r.dir)).toThrow(/no existe/i);
  });

  it("falla si tasks.md no existe", () => {
    const r = repo();
    // Crear un dir de feature sin tasks.md.
    r.write("specs/008-empty/.keep", "");
    expect(() => resolveFeature("008-empty", r.dir)).toThrow(/tasks\.md/i);
  });

  it("rechaza nombres con traversal incluso si el path existiera", () => {
    const r = repo();
    expect(() => resolveFeature("../../etc", r.dir)).toThrow();
  });
});
