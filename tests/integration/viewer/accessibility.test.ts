// T049 (009) — Auditoría estática de accesibilidad (sin nueva dependencia: sin jsdom/happy-dom). Cada
// requisito testable de la sección Accessibility de `spec.md` tiene su propia aserción: navegación por
// teclado, foco visible (≥3:1), landmarks semánticos, headings, labels, `prefers-reduced-motion`,
// alternativas textuales a swatches/estados (nunca depender solo del color).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function shell(): Promise<string> {
  const p = await makeHostProject();
  hosts.push(p);
  const deps = realViewerDeps(p.dir, newCallCounts());
  const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
  handles.push(handle);
  const res = await fetch(`http://127.0.0.1:${handle.port}/`);
  return res.text();
}

const MAIN_TS_SOURCE = readFileSync(fileURLToPath(new URL("../../../src/infrastructure/viewer/ui/main.ts", import.meta.url)), "utf8");

describe("Viewer accessibility (T049)", () => {
  it("landmarks semánticos: header/h1, nav con aria-label, main con id/tabindex/aria-live", async () => {
    const html = await shell();
    expect(html).toMatch(/<header>\s*<h1>/);
    expect(html).toMatch(/<nav aria-label="[^"]+">/);
    expect(html).toContain('<main id="content" tabindex="-1" aria-live="polite">');
  });

  it("skip-link presente y enfocable (navegación por teclado sin depender del mouse)", async () => {
    const html = await shell();
    expect(html).toMatch(/<a class="skip-link" href="#content">/);
  });

  it("cada sección de navegación es un <a> real con texto visible (label), no un div con solo onclick", async () => {
    const html = await shell();
    const links = [...html.matchAll(/<a href="#(\w+)" data-section="(\w+)">(\w+)<\/a>/g)];
    expect(links.length).toBe(17);
    for (const [, hrefId, dataId, text] of links) {
      expect(hrefId).toBe(dataId);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("foco visible con contraste (:focus-visible con outline de ancho y color explícitos)", async () => {
    const html = await shell();
    expect(html).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid #1a56db/);
  });

  it("prefers-reduced-motion declarado (ninguna animación se añade nunca, pero se documenta explícitamente)", async () => {
    const html = await shell();
    expect(html).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("los swatches de color son decorativos (aria-hidden) — el valor real se transmite como texto adyacente", () => {
    // Auditoría estática del código de render: cada swatch se marca aria-hidden y SIEMPRE va seguido de
    // un <span> de texto con el path/valor (nunca solo el color transmite la información).
    expect(MAIN_TS_SOURCE).toMatch(/swatch\.setAttribute\("aria-hidden", "true"\)/);
    expect(MAIN_TS_SOURCE).toMatch(/li\.append\(swatch, label\)/);
  });

  it("los estados degradados (partial/invalid/etc.) siempre se anuncian como texto, nunca solo con color/ícono", () => {
    expect(MAIN_TS_SOURCE).toMatch(/STATE_MESSAGES/);
    expect(MAIN_TS_SOURCE).toMatch(/statusParagraph\(STATE_MESSAGES/);
  });

  it("el contenido cambia de foco al landmark principal tras navegar (operable por teclado sin mouse)", () => {
    expect(MAIN_TS_SOURCE).toMatch(/el\.focus\(\); \/\/ el contenido cambió/);
  });

  it("no depende de ningún recurso remoto (CDN/fuente externa) en el shell servido", async () => {
    const html = await shell();
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("cdn.");
  });
});
