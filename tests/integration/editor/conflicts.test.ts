// T030 (010) — Paneles de conflicts/warnings: removal-with-dependents, group-removal-non-empty y
// colisiones producen `canApprove:false` con cero escrituras.
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
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
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host };
}

async function plan(base: string, operations: readonly unknown[]) {
  const res = await fetch(`${base}/api/editor/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formatVersion: "1.0.0", operations }),
  });
  return (await res.json()) as {
    readonly data: { readonly canApprove: boolean; readonly plan: { readonly issues: readonly { code: string; dependents: readonly string[] }[] } };
  };
}

describe("editor conflicts/warnings panels (T030)", () => {
  it("removal-with-dependents: canApprove=false, dependientes listados, cero escrituras", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");

    const result = await plan(base, [{ kind: "remove-token", path: "color.base.blue-500" }]);

    expect(result.data.canApprove).toBe(false);
    const issue = result.data.plan.issues.find((i) => i.code === "removal-with-dependents");
    expect(issue?.dependents).toContain("color.brand.primary");
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("group-removal-non-empty: canApprove=false, cero escrituras", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");

    const result = await plan(base, [{ kind: "remove-empty-group", path: "color.base" }]);

    expect(result.data.canApprove).toBe(false);
    expect(result.data.plan.issues.some((i) => i.code === "group-removal-non-empty")).toBe(true);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("colisión de rename: canApprove=false, cero escrituras", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");

    const result = await plan(base, [
      { kind: "create-token", path: "color.base.blue-600", type: "color", value: "#000000" },
      { kind: "rename-token", path: "color.base.blue-500", newName: "blue-600" },
    ]);

    expect(result.data.canApprove).toBe(false);
    expect(result.data.plan.issues.some((i) => i.code === "rename-collision")).toBe(true);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("comando válido sin conflictos: canApprove=true, cero escrituras (plan sigue siendo read-only)", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");

    const result = await plan(base, [{ kind: "update-description", path: "color.base.blue-500", description: "safe" }]);

    expect(result.data.canApprove).toBe(true);
    expect(result.data.plan.issues).toEqual([]);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });
});
