// T045 (004) - Foundations sobre filesystem real temporal, solo lectura.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRealInit } from "../../helpers/real-init.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { COLOR, VALID_MANIFEST, emptyProject, makeProject } from "../../helpers/ds-fixtures.js";
import {
  aliasToken,
  category,
  colorToken,
  expectReadOnly,
  foundation,
  issueCodes,
  resultOf,
  runFoundationsJson,
  seedDesignSystem,
  seedInvalidUtf8Tokens,
} from "./foundations-test-helpers.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function tmp(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}

describe("foundations filesystem outcomes (T045)", () => {
  it("not-found en proyecto sin DS", async () => {
    const root = await emptyProject(projects);
    const r = await runFoundationsJson(root);
    expect(r.code).toBe(5);
    expect(r.stderr).toBe("");
    expect(r.json).toMatchObject({ command: "foundations", outcome: "not-found", result: null, error: null });
  });

  it("init genera foundations partial: color partial, 8 absent, bytes intactos", async () => {
    const root = await tmp();
    const init = await runRealInit(root);
    expect(init.exitCode).toBe(0);
    await expectReadOnly(root, async () => {
      const r = await runFoundationsJson(root);
      expect(r.code).toBe(4);
      expect(r.json.outcome).toBe("partial");
      expect(category(r.json, "color")).toMatchObject({ state: "partial", counts: { total: 2, unclassified: 2 } });
      expect(resultOf(r.json).summary).toMatchObject({ categories: { absent: 8, partial: 1, complete: 0, invalid: 0 } });
    });
  });

  it("metadata en token primitive/semantic clasifica color como complete", async () => {
    const root = await tmp();
    await seedDesignSystem(root, {
      color: {
        base: colorToken("primitive"),
        role: { ...aliasToken("color.base", "semantic"), $type: "color" },
      },
    });
    const r = await runFoundationsJson(root);
    expect(r.code).toBe(0);
    expect(category(r.json, "color")).toMatchObject({ state: "complete", counts: { total: 2, primitive: 1, semantic: 1 } });
  });

  it("metadata de grupo y override de token resuelven niveles sin inferencia por path", async () => {
    const root = await tmp();
    await seedDesignSystem(root, {
      color: {
        $type: "color",
        ...foundation("semantic"),
        base: { ...colorToken(), ...foundation("primitive") },
        role: { $value: "{color.base}", $description: "d" },
      },
    });
    const r = await runFoundationsJson(root);
    const tokens = category(r.json, "color").tokens as Array<Record<string, unknown>>;
    expect(tokens.map((token) => [token.path, token.level, token.levelSource])).toEqual([
      ["color.base", "primitive", "token"],
      ["color.role", "semantic", "group"],
    ]);
  });

  it("metadata inválida marca complete-invalid con issue estable", async () => {
    const root = await tmp();
    await seedDesignSystem(root, { color: { bad: { ...colorToken(), ...foundation("core") } } });
    const r = await runFoundationsJson(root);
    expect(r.code).toBe(3);
    expect(issueCodes(r.json)).toContain("foundation-level-invalid");
    expect(category(r.json, "color").state).toBe("invalid");
  });

  it("categoría exacta y unresolved: background no se normaliza a color", async () => {
    const root = await tmp();
    await seedDesignSystem(root, { background: { primary: colorToken("primitive") } });
    const r = await runFoundationsJson(root);
    expect(r.code).toBe(4);
    expect((resultOf(r.json).unresolved as unknown[])).toHaveLength(1);
    expect(issueCodes(r.json)).toContain("foundation-category-unresolved");
  });

  it("type-mismatch de spacing con color produce categoría invalid", async () => {
    const root = await tmp();
    await seedDesignSystem(root, { spacing: { bad: colorToken("primitive") } });
    const r = await runFoundationsJson(root);
    expect(r.code).toBe(3);
    expect(category(r.json, "spacing").state).toBe("invalid");
    expect(issueCodes(r.json)).toContain("foundation-type-mismatch");
  });

  it("primitive -> semantic es prohibido; semantic -> primitive es válido", async () => {
    const badRoot = await tmp();
    await seedDesignSystem(badRoot, {
      color: {
        semantic: colorToken("semantic"),
        raw: { ...aliasToken("color.semantic", "primitive"), $type: "color" },
      },
    });
    const bad = await runFoundationsJson(badRoot);
    expect(bad.code).toBe(3);
    expect(issueCodes(bad.json)).toContain("foundation-forbidden-dependency");

    const okRoot = await tmp();
    await seedDesignSystem(okRoot, {
      color: {
        raw: colorToken("primitive"),
        semantic: { ...aliasToken("color.raw", "semantic"), $type: "color" },
      },
    });
    expect((await runFoundationsJson(okRoot)).code).toBe(0);
  });

  it("missing alias, cycle y alias-to-group se heredan como issues foundation", async () => {
    const cases = [
      ["alias-missing", { color: { $type: "color", a: aliasToken("color.nope", "semantic") } }],
      ["alias-cyclic", { color: { $type: "color", a: aliasToken("color.a", "semantic") } }],
      ["alias-to-group", { color: { $type: "color", group: {}, a: aliasToken("color.group", "semantic") } }],
    ] as const;
    for (const [code, tokens] of cases) {
      const root = await tmp();
      await seedDesignSystem(root, tokens);
      const r = await runFoundationsJson(root);
      expect(r.code).toBe(3);
      expect(issueCodes(r.json)).toContain(code);
    }
  });

  it("tipo desconocido no inventa foundation; tipo profundo reconocido puede quedar complete", async () => {
    const unknown = await tmp();
    await seedDesignSystem(unknown, { color: { x: { $type: "weird", $value: "v", ...foundation("primitive") } } });
    const unknownResult = await runFoundationsJson(unknown);
    expect(unknownResult.code).toBe(0);
    expect(category(unknownResult.json, "color")).toMatchObject({ state: "complete", counts: { total: 1 } });
    expect((category(unknownResult.json, "color").tokens as Array<Record<string, unknown>>)[0]).toMatchObject({ effectiveType: "weird" });

    const surface = await tmp();
    await seedDesignSystem(surface, { opacity: { alpha: { $type: "number", $value: 0.5, $description: "d", ...foundation("semantic") } } });
    const r = await runFoundationsJson(surface);
    expect(r.code).toBe(0);
    expect(issueCodes(r.json)).not.toContain("dtcg-type-not-deeply-inspected");
    expect(category(r.json, "opacity").state).toBe("complete");
  });

  it("UTF-8 inválido -> read-error y structural partial -> partial", async () => {
    const readError = await tmp();
    await seedInvalidUtf8Tokens(readError);
    const read = await runFoundationsJson(readError);
    expect(read.code).toBe(6);
    expect(read.json.outcome).toBe("read-error");

    const partial = await makeProject(projects, { tokens: false });
    const p = await runFoundationsJson(partial);
    expect(p.code).toBe(4);
    expect(p.json.outcome).toBe("partial");
  });

  it("$extensions desconocido, Unicode y rutas con espacios se preservan", async () => {
    const root = await tmp();
    const spaced = join(root, "folder with spaces");
    await mkdir(spaced, { recursive: true });
    await writeFileIn(spaced, "package.json", "{}\n");
    await writeFileIn(spaced, MANAGED_FILES.config, `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await writeFileIn(spaced, MANAGED_FILES.manifest, `${JSON.stringify({ ...VALID_MANIFEST, name: "Diseño Ñ" }, null, 2)}\n`);
    await writeFileIn(spaced, MANAGED_FILES.tokens, `${JSON.stringify({
      color: {
        "ñandú": {
          $type: "color",
          $value: COLOR,
          $description: "azul ñ",
          $extensions: { "otro.vendor": { keep: true }, "ar.neuraz.design-system-manager": { foundation: { level: "primitive" } } },
        },
      },
    }, null, 2)}\n`);
    const r = await runFoundationsJson(spaced);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("color.ñandú");
    expect(category(r.json, "color").state).toBe("complete");
  });
});
