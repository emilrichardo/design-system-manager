// T031 (010, actualizado en Checkpoint E) — Ninguna escritura ocurre antes de la aprobación explícita.
// Desde T034 existe `/api/editor/apply`, pero sigue sin re-implementar el gate de aprobación: un comando
// bloqueado (`canApprove:false`) nunca escribe porque `applyTokenMutation` (008) lo rechaza internamente.
// Cancelar/volver a editar nunca escribe nada.
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import type { ApplyTokenMutationDependencies } from "../../../src/application/token-mutations/apply-token-mutation.js";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { TOKENS_REL, newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";
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
const { createTokenSourceWriter } = (await import("../../../dist/infrastructure/token-mutations/token-source-writer.js")) as {
  createTokenSourceWriter: (rootDir: string) => ApplyTokenMutationDependencies["createWriter"] extends (r: string) => infer W ? W : never;
};

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function server(): Promise<{ readonly base: string; readonly host: HostProject }> {
  const host = await makeHostProject();
  hosts.push(host);
  const handle = await startViewerHttpServer({
    deps: realViewerDeps(host.dir, newCallCounts()),
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    editorApplyDeps: {
      apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: createTokenSourceWriter },
      viewer: realViewerDeps(host.dir, newCallCounts()),
    },
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host };
}

describe("approval boundary (T031)", () => {
  it("apply de un comando bloqueado (removal-with-dependents) nunca escribe: 008 rechaza internamente", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "remove-token", path: "color.base.blue-500" }] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { readonly data: { readonly apply: { readonly wrote: boolean } } };
    expect(body.data.apply.wrote).toBe(false);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("generar un plan, repetidamente, nunca escribe (plan es siempre read-only)", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const body = JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "d" }] });
    for (let i = 0; i < 3; i += 1) {
      const res = await fetch(`${base}/api/editor/plan`, { method: "POST", headers: { "content-type": "application/json" }, body });
      expect(res.status).toBe(200);
    }
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("un plan bloqueado (canApprove=false) nunca escribe, incluso si se solicita repetidamente", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const body = JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "remove-token", path: "color.base.blue-500" }] });
    const res = await fetch(`${base}/api/editor/plan`, { method: "POST", headers: { "content-type": "application/json" }, body });
    const parsed = (await res.json()) as { readonly data: { readonly canApprove: boolean } };
    expect(parsed.data.canApprove).toBe(false);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("GET /api/editor/session y POST /api/editor/refresh nunca escriben (solo reflejan la sesión del Viewer)", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    await fetch(`${base}/api/editor/session`);
    await fetch(`${base}/api/editor/refresh`, { method: "POST" });
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("el bundle de la UI compilada solo invoca apply dentro del handler de aprobación explícita, nunca en preview", async () => {
    const { readFile: readFs } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const source = await readFs(fileURLToPath(new URL("../../../dist/infrastructure/viewer/ui/main.js", import.meta.url)), "utf8");
    const previewSection = source.slice(0, source.indexOf("onApprove"));
    expect(previewSection).not.toContain("/api/editor/apply");
    expect(source).toContain("/api/editor/apply");
  });
});
