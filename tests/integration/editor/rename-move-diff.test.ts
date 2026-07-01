// T029 (010) — El diff visual del Editor coincide EXACTAMENTE con el diff de `008` (referencias
// reescritas por rename/move); nunca se recalcula ni se reconstruye en el Editor.
import { afterEach, describe, expect, it } from "vitest";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { ensureBuilt } from "../../helpers/run-binary.js";

ensureBuilt();
const { startViewerHttpServer } = (await import("../../../dist/infrastructure/viewer/http-server.js")) as {
  startViewerHttpServer: typeof StartViewerHttpServerType;
};
const { createTokenSourceSnapshotReader } = (await import("../../../dist/infrastructure/token-mutations/source-snapshot-reader.js")) as {
  createTokenSourceSnapshotReader: () => PlanTokenMutationDependencies["snapshot"];
};
const { serializeCandidate } = (await import("../../../dist/infrastructure/token-mutations/candidate-serializer.js")) as {
  serializeCandidate: PlanTokenMutationDependencies["serialize"];
};
const { planTokenMutation } = (await import("../../../dist/application/token-mutations/plan-token-mutation.js")) as {
  planTokenMutation: typeof import("../../../src/application/token-mutations/plan-token-mutation.js").planTokenMutation;
};
const { createTokenMutationCommand } = (await import("../../../dist/domain/token-mutations/command.js")) as {
  createTokenMutationCommand: typeof import("../../../src/domain/token-mutations/command.js").createTokenMutationCommand;
};

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function server(): Promise<{ readonly base: string; readonly host: HostProject; readonly deps: PlanTokenMutationDependencies }> {
  const host = await makeHostProject();
  hosts.push(host);
  const deps: PlanTokenMutationDependencies = { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate };
  const handle = await startViewerHttpServer({ deps: realViewerDeps(host.dir, newCallCounts()), editorPlanDeps: deps, executionDir: host.dir, host: "127.0.0.1" });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host, deps };
}

async function planViaEditor(base: string, operations: readonly unknown[]) {
  const res = await fetch(`${base}/api/editor/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formatVersion: "1.0.0", operations }),
  });
  return (await res.json()) as { readonly data: { readonly diff: { readonly entries: readonly unknown[] } | null } };
}

describe("editor visual diff matches 008 exactly (T029)", () => {
  it("rename con múltiples alias dependientes: el diff del editor tiene las mismas entradas que el de 008", async () => {
    const { base, host, deps } = await server();
    const operations = [{ kind: "rename-token", path: "color.base.blue-500", newName: "blue-600" }];

    const direct = await planTokenMutation({ executionDir: host.dir }, createTokenMutationCommand(operations as never), deps);
    const editor = await planViaEditor(base, operations);

    // `EditorDiffViewV1` envuelve el diff de 008 con un campo `isEmpty` adicional (nunca recalcula
    // entries/summary); comparamos exactamente los datos que 008 produjo, no el wrapper.
    expect((editor.data.diff as { entries: unknown; summary: unknown }).entries).toEqual(JSON.parse(JSON.stringify(direct.diff?.entries)));
    expect((editor.data.diff as { entries: unknown; summary: unknown }).summary).toEqual(JSON.parse(JSON.stringify(direct.diff?.summary)));
  });

  it("move con descendientes: referencias reescritas idénticas entre editor y 008", async () => {
    const { base, host, deps } = await server();
    const operations = [{ kind: "move-token", path: "color.base.blue-500", newParent: "color" }];

    const direct = await planTokenMutation({ executionDir: host.dir }, createTokenMutationCommand(operations as never), deps);
    const editor = await planViaEditor(base, operations);

    expect((editor.data.diff as { entries: unknown }).entries).toEqual(JSON.parse(JSON.stringify(direct.diff?.entries)));
    const moved = direct.diff?.entries.find((e) => e.kind === "moved");
    expect(moved?.references).toEqual(["color.brand.primary"]);
  });

  it("el diff nunca incluye rutas absolutas, bytes crudos ni stack", async () => {
    const { base } = await server();
    const editor = await planViaEditor(base, [{ kind: "rename-token", path: "color.base.blue-500", newName: "blue-700" }]);
    const text = JSON.stringify(editor.data.diff);
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//);
    expect(text).not.toContain("stack");
  });
});
