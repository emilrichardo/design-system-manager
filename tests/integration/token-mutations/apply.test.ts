// T031 (008) — `applyTokenMutation` con filesystem temporal real: create/update/alias/rename/move/remove/
// group aplicados, candidato válido tras apply, segunda ejecución `unchanged`, batch todo o nada.
import { afterEach, describe, expect, it } from "vitest";
import { applyTokenMutation } from "../../../src/application/token-mutations/apply-token-mutation.js";
import { createTokenMutationCommand } from "../../../src/domain/token-mutations/command.js";
import type { TokenMutationOperationV1 } from "../../../src/domain/token-mutations/operation.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { readTokens, realApplyDeps, seedInitializedProject, writeTokens } from "./real-deps.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function apply(project: TmpProject, ...ops: TokenMutationOperationV1[]) {
  return applyTokenMutation({ executionDir: project.dir }, createTokenMutationCommand(ops), realApplyDeps());
}

describe("applyTokenMutation — apply real (T031)", () => {
  it("create-token aplicado: outcome applied, escrito en disco", async () => {
    const project = await seedInitializedProject();
    projects.push(project);

    const r = await apply(project, { kind: "create-token", path: "spacing.100", value: { value: 4, unit: "px" }, type: "dimension" });

    expect(r.outcome).toBe("applied");
    expect(r.wrote).toBe(true);
    const tokens = (await readTokens(project)) as Record<string, unknown>;
    expect((tokens.spacing as Record<string, unknown>)["100"]).toMatchObject({ $type: "dimension", $value: { value: 4, unit: "px" } });
  });

  it("rename con múltiples aliases: todos reescritos, ninguno roto", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = (await readTokens(project)) as Record<string, unknown>;
    await writeTokens(project, {
      ...before,
      accent: { $type: "color", $value: "{color.base.blue-500}" },
      surface: { $type: "color", $value: "{color.base.blue-500}" },
    });

    const r = await apply(project, { kind: "rename-token", path: "color.base.blue-500", newName: "blue-600" });

    expect(r.outcome).toBe("applied");
    const tokens = (await readTokens(project)) as Record<string, unknown>;
    expect((tokens.color as Record<string, unknown>).base).toMatchObject({ "blue-600": expect.anything() });
    expect((tokens.accent as Record<string, unknown>).$value).toBe("{color.base.blue-600}");
    expect((tokens.surface as Record<string, unknown>).$value).toBe("{color.base.blue-600}");
    // accent, surface, y el alias preexistente de init (color.brand.primary): los tres reescritos.
    expect(((tokens.color as Record<string, unknown>).brand as Record<string, unknown>)).toMatchObject({ primary: { $value: "{color.base.blue-600}" } });
    expect(r.diff?.entries.filter((e) => e.kind === "alias-changed")).toHaveLength(3);
  });

  it("move con descendientes: el grupo y sus tokens quedan bajo el nuevo padre", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = (await readTokens(project)) as Record<string, unknown>;
    await writeTokens(project, { ...before, brandGroup: { primary: { 500: { $type: "color", $value: "#112233" } } } });

    const r = await apply(project, { kind: "move-group", path: "brandGroup.primary", newParent: "color" });

    expect(r.outcome).toBe("applied");
    const tokens = (await readTokens(project)) as Record<string, unknown>;
    expect((tokens.color as Record<string, unknown>).primary).toMatchObject({ 500: { $type: "color", $value: "#112233" } });
    expect((tokens.brandGroup as Record<string, unknown> | undefined)?.primary).toBeUndefined();
  });

  it("remove con dependientes: bloqueado, sin escritura", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);

    const r = await apply(project, { kind: "remove-token", path: "color.base.blue-500" });

    expect(r.outcome).toBe("conflict");
    expect(r.wrote).toBe(false);
    expect(r.conflicts.some((c) => c.code === "removal-with-dependents")).toBe(true);
    expect(await readTokens(project)).toEqual(before);
  });

  it("remove-alias inlina el valor resuelto", async () => {
    const project = await seedInitializedProject();
    projects.push(project);

    const r = await apply(project, { kind: "remove-alias", path: "color.brand.primary" });

    expect(r.outcome).toBe("applied");
    const tokens = (await readTokens(project)) as Record<string, unknown>;
    const primary = (tokens.color as Record<string, unknown>).brand as Record<string, unknown>;
    expect((primary.primary as Record<string, unknown>).$value).toMatchObject({ colorSpace: "srgb" });
  });

  it("segunda ejecución del mismo comando: unchanged, sin escritura", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const op: TokenMutationOperationV1 = { kind: "update-value", path: "color.base.blue-500", value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 1, hex: "#000000" } };

    const first = await apply(project, op);
    expect(first.outcome).toBe("applied");
    const afterFirst = await readTokens(project);

    const second = await apply(project, op);
    expect(second.outcome).toBe("unchanged");
    expect(second.wrote).toBe(false);
    expect(await readTokens(project)).toEqual(afterFirst);
  });

  it("batch todo o nada: una operación inválida bloquea el comando completo", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);

    const r = await apply(
      project,
      { kind: "create-token", path: "spacing.200", value: { value: 8, unit: "px" }, type: "dimension" },
      { kind: "create-token", path: "spacing.200", value: { value: 16, unit: "px" }, type: "dimension" }, // colisión: mismo path dos veces en el batch
    );

    expect(r.outcome).toBe("conflict");
    expect(r.wrote).toBe(false);
    expect(await readTokens(project)).toEqual(before); // ni siquiera la primera operación quedó aplicada
  });
});
