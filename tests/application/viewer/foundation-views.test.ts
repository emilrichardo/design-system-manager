// T036 (009) — Cada categoría restante (spacing/radius/border/shadow/motion) lista exactamente los
// tokens que `004` le asigna, mismos conteos que el Overview (SC-003), sobre una sesión real.
import { afterEach, describe, expect, it } from "vitest";
import { buildViewerSession } from "../../../src/application/viewer/build-session.js";
import { buildViewerSectionDetail } from "../../../src/application/viewer/build-section-detail.js";
import type { ViewerFoundationV1 } from "../../../src/application/viewer/foundation.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "./real-deps.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

const SECTIONS_TO_CATEGORY = [
  ["spacing", "spacing"],
  ["radius", "radius"],
  ["borders", "border"],
  ["shadows", "shadow"],
  ["motion", "motion"],
] as const;

describe("remaining foundation views (T036)", () => {
  for (const [section, categoryId] of SECTIONS_TO_CATEGORY) {
    it(`${section} lista exactamente los tokens que 004 asigna a "${categoryId}"`, async () => {
      const p = await makeHostProject();
      hosts.push(p);
      const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), section);
      expect(detail.state).toBe("ready");
      const foundation = detail.data as ViewerFoundationV1;
      expect(foundation.id).toBe(categoryId);
      // El fixture de init no tiene tokens en estas categorías: absent, 0 tokens (nunca una lista fabricada).
      expect(foundation.state).toBe("absent");
      expect(foundation.tokens).toEqual([]);
      expect(foundation.counts.total).toBe(0);
    });
  }

  it("foundations agrega las 9 categorías canónicas en orden", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), "foundations");
    const categories = detail.data as readonly ViewerFoundationV1[];
    expect(categories.map((c) => c.id)).toEqual(["color", "spacing", "typography", "radius", "border", "shadow", "opacity", "sizing", "motion"]);
  });

  it("color (con tokens reales del fixture de init) tiene el mismo conteo que overview.tokens.total para esa categoría", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    const navColors = session.navigation?.sections.find((s) => s.id === "colors");
    const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), "colors");
    const colors = detail.data as readonly unknown[];
    expect(colors.length).toBe(navColors?.count);
  });

  it("una categoría absent no aparece como conflict/invalid (estado correcto, sin issues fabricados)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), "spacing");
    const foundation = detail.data as ViewerFoundationV1;
    expect(foundation.issues).toEqual([]);
  });
});
