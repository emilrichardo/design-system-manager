// T015 (007) — Sanitización de SVG: elimina script/onload/href externo/foreignObject/DOCTYPE; bloquea
// lo no saneable; bytes saneados deterministas y sin contenido activo.
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../../../src/infrastructure/assets/svg-sanitizer.js";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const dec = (b: Uint8Array): string => new TextDecoder().decode(b);

describe("sanitizeSvg (T015)", () => {
  it("elimina script, onload y href externo; queda SVG seguro", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" onload="evil()"><script>alert(1)</script><rect/><image href="https://x/y.png"/></svg>`;
    const r = sanitizeSvg(enc(svg));
    expect(r.safe).toBe(true);
    expect(r.bytes).not.toBeNull();
    const out = dec(r.bytes!);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onload\s*=/i);
    expect(out).not.toMatch(/href\s*=\s*"https:/i);
    expect(out).toContain("<rect");
    expect(r.report.removed).toEqual(expect.arrayContaining(["script", "event-handler", "external-ref"]));
  });

  it("elimina DOCTYPE/ENTITY (XXE) y foreignObject", () => {
    const svg = `<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body/></foreignObject><circle/></svg>`;
    const r = sanitizeSvg(enc(svg));
    expect(r.safe).toBe(true);
    expect(dec(r.bytes!)).not.toMatch(/foreignObject/i);
    expect(dec(r.bytes!)).not.toMatch(/<!DOCTYPE/i);
    expect(r.report.removed).toEqual(expect.arrayContaining(["doctype", "entity", "foreign-object"]));
  });

  it("bloquea entrada que no es SVG", () => {
    const r = sanitizeSvg(enc("<html><body>nope</body></html>"));
    expect(r.safe).toBe(false);
    expect(r.bytes).toBeNull();
    expect(r.report.reason).toBeTruthy();
  });

  it("SVG ya limpio pasa sin cambios materiales y es determinista", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>`;
    const a = sanitizeSvg(enc(svg));
    const b = sanitizeSvg(enc(svg));
    expect(a.safe).toBe(true);
    expect(dec(a.bytes!)).toBe(dec(b.bytes!));
    expect(a.report.removed).toEqual([]);
  });
});
