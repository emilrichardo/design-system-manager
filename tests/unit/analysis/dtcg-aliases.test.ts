// T027 — Aliases: válido, cadena, roto, a-grupo, ciclo directo/indirecto, malformado, longitud,
// precedencia frente al grupo, propagación del tipo.
import { describe, expect, it } from "vitest";
import { traverseDtcgTree, type TraversalLimits } from "../../../src/infrastructure/analysis/traverse-dtcg-tree.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";

const color = { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" };
const ctok = { $type: "color", $value: color, $description: "d" };
const alias = (target: string) => ({ $value: `{${target}}`, $description: "d" });

function nodeAt(r: ReturnType<typeof traverseDtcgTree>, path: string) {
  return r.nodes.find((n) => n.path === path);
}
const errCodes = (r: ReturnType<typeof traverseDtcgTree>) => r.errors.map((i) => i.code);

describe("aliases", () => {
  it("alias directo válido → aliasState valid, tipo propagado del destino", () => {
    const r = traverseDtcgTree({ color: { base: ctok, primary: { ...alias("color.base"), $type: undefined } } });
    const p = nodeAt(r, "color.primary");
    expect(p?.kind).toBe("alias");
    expect(p?.aliasState).toBe("valid");
    expect(p?.effectiveType).toBe("color");
    expect(p?.typeOrigin).toBe("alias");
    expect(r.valid).toBe(true);
  });

  it("cadena de aliases propaga el tipo final", () => {
    const r = traverseDtcgTree({ g: { base: ctok, a: alias("g.base"), b: alias("g.a") } });
    expect(nodeAt(r, "g.b")?.effectiveType).toBe("color");
    expect(r.valid).toBe(true);
  });

  it("alias inexistente → error alias-missing, untrusted", () => {
    const r = traverseDtcgTree({ g: { a: alias("g.nope") } });
    expect(errCodes(r)).toContain("alias-missing");
    expect(nodeAt(r, "g.a")?.aliasState).toBe("missing");
    expect(nodeAt(r, "g.a")?.trust).toBe("untrusted");
    expect(r.valid).toBe(false);
  });

  it("alias a grupo → error alias-to-group", () => {
    const r = traverseDtcgTree({ color: { base: ctok }, ref: alias("color") });
    expect(errCodes(r)).toContain("alias-to-group");
    expect(nodeAt(r, "ref")?.aliasState).toBe("to-group");
  });

  it("ciclo directo a→a → alias-cyclic, sin tipo efectivo", () => {
    const r = traverseDtcgTree({ g: { a: alias("g.a") } });
    expect(errCodes(r)).toContain("alias-cyclic");
    expect(nodeAt(r, "g.a")?.aliasState).toBe("cyclic");
    expect(nodeAt(r, "g.a")?.effectiveType).toBeNull();
  });

  it("ciclo indirecto a→b→c→a → todos cyclic", () => {
    const r = traverseDtcgTree({ g: { a: alias("g.b"), b: alias("g.c"), c: alias("g.a") } });
    for (const p of ["g.a", "g.b", "g.c"]) expect(nodeAt(r, p)?.aliasState).toBe("cyclic");
    // un issue alias-cyclic por integrante (sin duplicados accidentales)
    expect(r.errors.filter((i) => i.code === "alias-cyclic")).toHaveLength(3);
  });

  it("alias malformado ({{...}) → alias-malformed", () => {
    const r = traverseDtcgTree({ g: { a: { $value: "{a}{b}", $description: "d" } } });
    expect(errCodes(r)).toContain("alias-malformed");
    expect(nodeAt(r, "g.a")?.aliasState).toBe("malformed");
  });

  it("referencia demasiado larga → alias-too-long", () => {
    const limits: TraversalLimits = { ...ANALYSIS_LIMITS, maxAliasLength: 3 };
    const r = traverseDtcgTree({ g: { a: alias("color.base.long") } }, limits);
    expect(errCodes(r)).toContain("alias-too-long");
    expect(nodeAt(r, "g.a")?.aliasState).toBe("malformed");
  });

  it("precedencia: tipo propio del alias gana sobre destino y grupo", () => {
    const r = traverseDtcgTree({ color: { $type: "color", base: ctok, p: { $type: "dimension", $value: "{color.base}", $description: "d" } } });
    expect(nodeAt(r, "color.p")?.effectiveType).toBe("dimension");
    expect(nodeAt(r, "color.p")?.typeOrigin).toBe("own");
  });

  it("alias sin tipo dentro de grupo tipado toma el tipo del DESTINO, no el del grupo", () => {
    // grupo 'g' tipado dimension; alias apunta a un token color → gana color (destino), no dimension.
    const r = traverseDtcgTree({ color: { base: ctok }, g: { $type: "dimension", ref: alias("color.base") } });
    expect(nodeAt(r, "g.ref")?.effectiveType).toBe("color");
    expect(nodeAt(r, "g.ref")?.typeOrigin).toBe("alias");
  });

  it("alias roto NO cae al tipo del grupo", () => {
    const r = traverseDtcgTree({ g: { $type: "color", ref: alias("g.missing") } });
    expect(nodeAt(r, "g.ref")?.effectiveType).toBeNull();
    expect(errCodes(r)).toContain("alias-missing");
  });
});
