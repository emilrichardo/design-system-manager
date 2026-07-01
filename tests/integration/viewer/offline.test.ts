// T050 (009) — Sesión completa (abrir + cada vista + búsqueda + preview de alias) exitosa sin red
// (solo loopback, `127.0.0.1`); ningún archivo del Viewer referencia un host remoto/CDN.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { searchTokens } from "../../../src/application/viewer/search-filter.js";
import { projectRenameMoveImpactPreview, projectAlias } from "../../../src/application/viewer/alias.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

const VIEWER_SECTIONS = ["overview", "colors", "typography", "spacing", "radius", "borders", "shadows", "motion", "aliases", "foundations", "assets", "presets", "issues", "build"];

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

function allSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...allSourceFiles(full));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("Viewer works fully offline (T050)", () => {
  it("sesión completa: abrir + cada una de las 14 secciones responden 200 vía loopback", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
    handles.push(handle);
    const base = `http://127.0.0.1:${handle.port}`;

    const sessionRes = await fetch(`${base}/api/session`);
    expect(sessionRes.status).toBe(200);

    for (const id of VIEWER_SECTIONS) {
      const res = await fetch(`${base}/api/section/${id}`);
      expect(res.status).toBe(200);
    }
  });

  it("búsqueda sobre datos ya cargados: cero llamadas de red adicionales (función pura, no fetch)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
    handles.push(handle);
    const res = await fetch(`http://127.0.0.1:${handle.port}/api/section/colors`);
    const envelope = (await res.json()) as { readonly data: readonly { readonly token: ViewerTokenV1 }[] };
    const colors = envelope.data.map((c) => c.token);
    const filtered = searchTokens(colors, { query: "blue" });
    expect(Array.isArray(filtered)).toBe(true);
  });

  it("preview de impacto de alias funciona completamente offline (solo el plan local read-only de 008)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const a = projectAlias({ path: "color.base.blue-500", kind: "concrete", immediateTarget: null, chain: [], dependents: ["color.brand.primary"], state: "n/a" });
    const result = await projectRenameMoveImpactPreview(a, "color.base.blue-600", "rename", deps.planRenameMoveImpact);
    expect(result.impactPreview).not.toBeNull();
  });

  it("ningún archivo fuente del Viewer referencia un host remoto/CDN (solo 127.0.0.1/loopback)", () => {
    const appDir = fileURLToPath(new URL("../../../src/application/viewer", import.meta.url));
    const infraDir = fileURLToPath(new URL("../../../src/infrastructure/viewer", import.meta.url));
    for (const file of [...allSourceFiles(appDir), ...allSourceFiles(infraDir)]) {
      const text = readFileSync(file, "utf8");
      // `http://localhost` se usa únicamente como base para parsear `req.url` (node:http, sin llamada de
      // red real); `127.0.0.1` es el único host que el servidor efectivamente escucha/marca.
      const remoteUrls = text.match(/https?:\/\/(?!127\.0\.0\.1)(?!localhost)[^\s"'`]+/g) ?? [];
      expect(remoteUrls, `${file} references a remote URL: ${remoteUrls.join(", ")}`).toEqual([]);
    }
  });
});
