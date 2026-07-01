// T033 (008) — Preservación: `applyTokenMutation` solo toca `design-system/tokens/base.tokens.json`.
// `design-system/build/**`, `design-system/assets/**` y el host manifest quedan byte-idénticos;
// `$extensions` y propiedades desconocidas (de vendors ajenos a Neuraz) se conservan; ningún alias
// preexistente queda roto tras la mutación.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyTokenMutation } from "../../../src/application/token-mutations/apply-token-mutation.js";
import { createTokenMutationCommand } from "../../../src/domain/token-mutations/command.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { writeFileIn } from "../../helpers/tmp-project.js";
import { realApplyDeps, readTokens, seedInitializedProject, writeTokens } from "./real-deps.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("applyTokenMutation — preservación de assets/build/manifest/unknown (T033)", () => {
  it("build/, assets/ y el manifest quedan byte-idénticos tras aplicar una mutación", async () => {
    const project = await seedInitializedProject();
    projects.push(project);

    await writeFileIn(project.dir, "design-system/build/tokens.css", ":root { --color-base-blue-500: #3b82f6; }\n");
    await writeFileIn(project.dir, "design-system/build/manifest.json", '{"formatVersion":"1.0.0"}\n');
    await writeFileIn(project.dir, "design-system/assets/icons/star.svg", "<svg></svg>\n");
    const manifestBefore = await readFile(join(project.dir, MANAGED_FILES.manifest), "utf8");
    const buildCssBefore = await readFile(join(project.dir, "design-system/build/tokens.css"), "utf8");
    const buildManifestBefore = await readFile(join(project.dir, "design-system/build/manifest.json"), "utf8");
    const assetBefore = await readFile(join(project.dir, "design-system/assets/icons/star.svg"), "utf8");

    const r = await applyTokenMutation(
      { executionDir: project.dir },
      createTokenMutationCommand([{ kind: "create-token", path: "spacing.400", value: { value: 16, unit: "px" }, type: "dimension" }]),
      realApplyDeps(),
    );

    expect(r.outcome).toBe("applied");
    expect(await readFile(join(project.dir, MANAGED_FILES.manifest), "utf8")).toBe(manifestBefore);
    expect(await readFile(join(project.dir, "design-system/build/tokens.css"), "utf8")).toBe(buildCssBefore);
    expect(await readFile(join(project.dir, "design-system/build/manifest.json"), "utf8")).toBe(buildManifestBefore);
    expect(await readFile(join(project.dir, "design-system/assets/icons/star.svg"), "utf8")).toBe(assetBefore);
  });

  it("$extensions desconocidos (vendor ajeno) y propiedades no gestionadas se preservan tras la mutación", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = (await readTokens(project)) as Record<string, unknown>;
    const withUnknown = {
      ...before,
      color: {
        ...(before.color as Record<string, unknown>),
        base: {
          ...((before.color as Record<string, unknown>).base as Record<string, unknown>),
          "blue-500": {
            ...(((before.color as Record<string, unknown>).base as Record<string, unknown>)["blue-500"] as Record<string, unknown>),
            $extensions: { "com.example.other-vendor": { note: "no tocar", nested: { keep: true } } },
          },
        },
      },
      $unknownTopLevel: { keepMe: 42 },
    };
    await writeTokens(project, withUnknown);

    const r = await applyTokenMutation(
      { executionDir: project.dir },
      createTokenMutationCommand([{ kind: "update-description", path: "color.base.blue-500", description: "actualizado" }]),
      realApplyDeps(),
    );

    expect(r.outcome).toBe("applied");
    const after = (await readTokens(project)) as Record<string, unknown>;
    expect(after.$unknownTopLevel).toEqual({ keepMe: 42 });
    const blue500 = ((after.color as Record<string, unknown>).base as Record<string, unknown>)["blue-500"] as Record<string, unknown>;
    expect(blue500.$extensions).toEqual({ "com.example.other-vendor": { note: "no tocar", nested: { keep: true } } });
    expect(blue500.$description).toBe("actualizado");
  });

  it("ningún alias preexistente queda roto tras la mutación", async () => {
    const project = await seedInitializedProject();
    projects.push(project);

    const r = await applyTokenMutation(
      { executionDir: project.dir },
      createTokenMutationCommand([{ kind: "create-token", path: "color.base.green-500", value: "#22c55e", type: "color" }]),
      realApplyDeps(),
    );

    expect(r.outcome).toBe("applied");
    const tokens = (await readTokens(project)) as Record<string, unknown>;
    const brandPrimary = ((tokens.color as Record<string, unknown>).brand as Record<string, unknown>).primary as Record<string, unknown>;
    expect(brandPrimary.$value).toBe("{color.base.blue-500}");
    // el target del alias preexistente sigue presente (no se rompió la referencia).
    expect((tokens.color as Record<string, unknown>).base).toMatchObject({ "blue-500": expect.anything() });
  });
});
