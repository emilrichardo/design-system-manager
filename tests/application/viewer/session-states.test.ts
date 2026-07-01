// T017 (009) — Cada outcome real de `002` (`valid`/`complete-invalid`/`partial`/`not-found`/`read-error`)
// produce el `ViewerStateV1` correcto vía `buildViewerSession` sobre fixtures reales, incluido el caso
// derivado `empty`.
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildViewerSession } from "../../../src/application/viewer/build-session.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { newCallCounts, realViewerDeps } from "./real-deps.js";
import { makeHostProject } from "../../helpers/build-host.js";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function tmp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "viewer-states-"));
  dirs.push(dir);
  return dir;
}

const MANIFEST = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens", description: "d" };

describe("buildViewerSession — real 002 outcomes (T017)", () => {
  it("not-found: proyecto sin design-system", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "package.json"), '{"name":"h"}\n');
    const session = await buildViewerSession({ executionDir: dir }, realViewerDeps(dir, newCallCounts()));
    expect(session.state).toBe("not-found");
    expect(session.overview).toBeNull();
    expect(session.navigation).toBeNull();
    expect(session.host.initialized).toBe(false);
  });

  it("partial: config y tokens presentes, sin manifest (el reader 006 solo exige el documento de tokens)", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "package.json"), '{"name":"h"}\n');
    await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
    await writeFile(join(dir, "design-system", "tokens", "base.tokens.json"), `${JSON.stringify(buildTokens(), null, 2)}\n`);
    const session = await buildViewerSession({ executionDir: dir }, realViewerDeps(dir, newCallCounts()));
    expect(session.state).toBe("partial");
    expect(session.overview).not.toBeNull(); // partial conserva overview/navigation (nunca pantalla vacía)
    expect(session.navigation).not.toBeNull();
  });

  it("sin documento de tokens (aunque el config exista) → not-found: el reader 006 solo produce un snapshot cuando el documento de tokens existe; sin él no hay contenido de Viewer que proyectar", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "package.json"), '{"name":"h"}\n');
    await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
    const session = await buildViewerSession({ executionDir: dir }, realViewerDeps(dir, newCallCounts()));
    expect(session.state).toBe("not-found");
  });

  it("read-error: tokens.json con encoding inválido", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "package.json"), '{"name":"h"}\n');
    await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
    await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
    await writeFile(join(dir, "design-system", "tokens", "base.tokens.json"), Buffer.from([0xff, 0xfe, 0x00, 0x81]));
    const session = await buildViewerSession({ executionDir: dir }, realViewerDeps(dir, newCallCounts()));
    expect(session.state).toBe("read-error");
    expect(session.overview).toBeNull();
    expect(session.navigation).toBeNull();
  });

  it("complete-invalid: $type DTCG no reconocido", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "package.json"), '{"name":"h"}\n');
    await writeFile(join(dir, "neuraz-ds.config.json"), `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await mkdir(join(dir, "design-system", "tokens"), { recursive: true });
    await writeFile(join(dir, "design-system", "design-system.json"), `${JSON.stringify(MANIFEST, null, 2)}\n`);
    await writeFile(join(dir, "design-system", "tokens", "base.tokens.json"), '{"color":{"$type":"not-a-real-type","x":{"$value":1}}}\n');
    const session = await buildViewerSession({ executionDir: dir }, realViewerDeps(dir, newCallCounts()));
    expect(session.state).toBe("invalid-design-system");
    expect(session.overview).not.toBeNull(); // recuperable: se preserva la inspección posible
  });

  it("valid con contenido → ready", async () => {
    const p = await makeHostProject();
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    expect(session.state).toBe("ready");
    expect(session.overview?.tokens.total).toBeGreaterThan(0);
    await p.cleanup();
  });

  it("valid sin ningún token/asset/preset → empty (derivado, nunca un outcome nuevo)", async () => {
    const p = await makeHostProject({ tokens: {} });
    const deps = realViewerDeps(p.dir, newCallCounts());
    const emptyDeps = { ...deps, listPresets: async () => ({ outcome: "success" as const, presets: [], validation: null }) };
    const session = await buildViewerSession({ executionDir: p.dir }, emptyDeps);
    expect(session.state).toBe("empty");
    expect(session.overview?.tokens.total).toBe(0);
    await p.cleanup();
  });
});
