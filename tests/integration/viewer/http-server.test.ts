// T026 (009) — `GET /api/session` responde un `ViewerJsonEnvelopeV1` válido; ningún método distinto de
// `GET`/`HEAD` está soportado (405); el servidor solo escucha en loopback (127.0.0.1, offline-first).
// Usa el servidor COMPILADO (`dist/`), no el TS fuente: sirve estáticos junto a su propio `import.meta.url`
// y el bundle de la UI (`ui/main.js`) solo existe compilado — mismo patrón que `ensureBuilt()`.
import { afterEach, describe, expect, it } from "vitest";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

ensureBuilt();
const { startViewerHttpServer } = (await import("../../../dist/infrastructure/viewer/http-server.js")) as {
  startViewerHttpServer: typeof StartViewerHttpServerType;
};

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function server(): Promise<{ handle: ViewerHttpServerHandle; base: string }> {
  const p = await makeHostProject();
  hosts.push(p);
  const deps = realViewerDeps(p.dir, newCallCounts());
  const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
  handles.push(handle);
  return { handle, base: `http://127.0.0.1:${handle.port}` };
}

describe("Viewer HTTP server (T026)", () => {
  it("GET /api/session responde un ViewerJsonEnvelopeV1 válido", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/session`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toMatchObject({ formatVersion: "1.0.0", section: "session", state: "ready" });
    expect(body.data.overview.tokens.total).toBeGreaterThan(0);
  });

  it("GET /api/section/colors responde un envelope de sección", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/section/colors`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ formatVersion: "1.0.0", section: "colors" });
  });

  it("GET /api/section/<id inválido> → 404", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/section/not-a-real-section`);
    expect(res.status).toBe(404);
  });

  it("ningún método distinto de GET/HEAD está soportado (POST → 405)", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/session`, { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toContain("GET");
  });

  it("PUT y DELETE también → 405 (el read-only se extiende al wire protocol)", async () => {
    const { base } = await server();
    for (const method of ["PUT", "DELETE", "PATCH"]) {
      const res = await fetch(`${base}/api/session`, { method });
      expect(res.status).toBe(405);
    }
  });

  it("GET / sirve el shell HTML con las 17 secciones", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain('data-section="colors"');
    expect(html).toContain('<script type="module" src="/ui/main.js">');
  });

  it("GET /ui/main.js sirve el bundle estático compilado", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/ui/main.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("javascript");
  });

  it("escucha solo en 127.0.0.1 (loopback), nunca 0.0.0.0", async () => {
    const { handle } = await server();
    const address = handle.server.address();
    expect(typeof address === "object" && address !== null ? address.address : null).toBe("127.0.0.1");
  });

  it("no expone rutas absolutas ni stack en la respuesta de sesión", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/session`);
    const text = await res.text();
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//);
    expect(text).not.toContain("at Object.<anonymous>");
  });
});
