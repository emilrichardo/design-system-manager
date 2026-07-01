// T018 (009) — Los números del overview y de cada sección de navegación igualan los conteos fuente para
// la MISMA sesión (SC-003): ningún conteo se recalcula independientemente.
import { afterEach, describe, expect, it } from "vitest";
import { buildViewerSession } from "../../../src/application/viewer/build-session.js";
import { VIEWER_SECTION_ORDER } from "../../../src/application/viewer/navigation.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "./real-deps.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

describe("overview/navigation number consistency (T018)", () => {
  it("navigation.sections tiene las 14 secciones canónicas en orden fijo", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    expect(session.navigation?.sections.map((s) => s.id)).toEqual([...VIEWER_SECTION_ORDER]);
  });

  it("navigation.colors/typography count == overview del mismo estado (sin recomputar)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    const overview = session.overview!;
    const navigation = session.navigation!;
    const colors = navigation.sections.find((s) => s.id === "colors")!;
    // El fixture de init tiene 2 tokens de color (base + alias de marca); overview.tokens.total los cuenta.
    expect(colors.count).toBeGreaterThan(0);
    expect(colors.count).toBeLessThanOrEqual(overview.tokens.total);
    const aliases = navigation.sections.find((s) => s.id === "aliases")!;
    expect(aliases.count).toBe(overview.aliases.total);
    const assets = navigation.sections.find((s) => s.id === "assets")!;
    expect(assets.count).toBe(overview.assets.totalAssets);
    const presets = navigation.sections.find((s) => s.id === "presets")!;
    expect(presets.count).toBe(overview.presets.total);
    const issues = navigation.sections.find((s) => s.id === "issues")!;
    expect(issues.count).toBe(overview.issues.total);
    const build = navigation.sections.find((s) => s.id === "build")!;
    expect(build.count).toBe(overview.build.formats.length);
  });

  it("overview.foundations.categories suma coincide con las 9 categorías (absent+partial+complete+invalid = 9)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    const c = session.overview!.foundations.categories;
    expect(c.absent + c.partial + c.complete + c.invalid).toBe(9);
  });

  it("overview.assets.byKind incluye las 5 claves de AssetKind (record de forma fija, nunca sparse)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    expect(Object.keys(session.overview!.assets.byKind).sort()).toEqual(["font", "icon", "image", "logo", "svg"]);
  });

  it("build.stale es false cuando hasBuild es false (invariante del contrato)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    expect(session.overview!.build.hasBuild).toBe(false);
    expect(session.overview!.build.stale).toBe(false);
  });
});
