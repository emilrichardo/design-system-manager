// T037 (010) — applied -> Viewer reload -> updated token visible; refresh-failed preserva el resultado
// de apply exitoso (nunca se pierde ni se transforma en error).
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

async function server(viewerDeps?: ReturnType<typeof realViewerDeps>): Promise<{ readonly base: string; readonly host: HostProject }> {
  const host = await makeHostProject();
  hosts.push(host);
  const handle = await startViewerHttpServer({
    deps: viewerDeps ?? realViewerDeps(host.dir, newCallCounts()),
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    editorApplyDeps: {
      apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: createTokenSourceWriter },
      viewer: viewerDeps ?? realViewerDeps(host.dir, newCallCounts()),
    },
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host };
}

describe("apply -> Viewer refresh (T037)", () => {
  it("applied: la sesión del Viewer recargada refleja el valor actualizado", async () => {
    const { base, host } = await server();
    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formatVersion: "1.0.0",
        operations: [{ kind: "update-description", path: "color.base.blue-500", description: "Edited from visual editor" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean }; readonly refresh: { readonly state: string; readonly session: unknown } };
    };
    expect(body.data.apply.state).toBe("applied");
    expect(body.data.apply.wrote).toBe(true);
    expect(body.data.refresh.state).toBe("reloaded");
    expect(body.data.refresh.session).not.toBeNull();

    const after = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    expect(after).toContain("Edited from visual editor");

    const sectionRes = await fetch(`${base}/api/section/colors`);
    const section = (await sectionRes.json()) as {
      readonly data: readonly { readonly token: { readonly path: string; readonly description: string | null } }[];
    };
    const updated = section.data.find((c) => c.token.path === "color.base.blue-500");
    expect(updated?.token.description).toBe("Edited from visual editor");
  });

  it("unchanged: candidato idéntico a la fuente, cero escrituras, refresh igualmente disponible", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [] }),
    });
    const body = (await res.json()) as { readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean } } };
    expect(body.data.apply.state).toBe("unchanged");
    expect(body.data.apply.wrote).toBe(false);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("refresh-failed: si el refresh posterior al apply falla, el resultado de apply exitoso permanece visible", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    let calls = 0;
    const baseViewerDeps = realViewerDeps(host.dir, newCallCounts());
    const flakyViewerDeps = {
      ...baseViewerDeps,
      readBuildSnapshot: async (...args: Parameters<typeof baseViewerDeps.readBuildSnapshot>) => {
        calls += 1;
        if (calls > 1) throw new Error("simulated refresh failure");
        return baseViewerDeps.readBuildSnapshot(...args);
      },
    };
    const handle = await startViewerHttpServer({
      deps: flakyViewerDeps,
      editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
      editorApplyDeps: {
        apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: createTokenSourceWriter },
        viewer: flakyViewerDeps,
      },
      executionDir: host.dir,
      host: "127.0.0.1",
    });
    handles.push(handle);
    const base = `http://127.0.0.1:${handle.port}`;

    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formatVersion: "1.0.0",
        operations: [{ kind: "update-description", path: "color.base.blue-500", description: "refresh will fail" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean }; readonly refresh: { readonly state: string; readonly session: unknown } };
    };
    expect(body.data.apply.state).toBe("applied");
    expect(body.data.apply.wrote).toBe(true);
    expect(body.data.refresh.state).toBe("failed");
    expect(body.data.refresh.session).toBeNull();

    const after = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    expect(after).toContain("refresh will fail");
  });
});
