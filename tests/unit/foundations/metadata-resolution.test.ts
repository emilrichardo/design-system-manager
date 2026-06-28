// T009/T010/T011 (004) — Parser de `$extensions`, resolución de nivel y pasada O(nodes) sobre parsed.
import { describe, expect, it } from "vitest";
import {
  NEURAZ_EXTENSION_NAMESPACE,
  parseFoundationExtension,
} from "../../../src/domain/foundations/parse-foundation-extension.js";
import { resolveFoundationLevel } from "../../../src/domain/foundations/resolve-foundation-level.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { deepFreeze } from "../json/json-test-utils.js";

const NS = NEURAZ_EXTENSION_NAMESPACE;
const ext = (level: unknown, extra: Record<string, unknown> = {}) => ({
  $extensions: { [NS]: { foundation: { level, ...extra } } },
});
const tok = (level?: unknown) => (level === undefined ? { $value: "v" } : { $value: "v", ...ext(level) });

// ── Parser (T009) ─────────────────────────────────────────────────────────────────────────────────
describe("parseFoundationExtension (T009)", () => {
  it("ausente: sin $extensions, sin namespace, namespace sin foundation, otros vendors", () => {
    expect(parseFoundationExtension({})).toEqual({ kind: "absent" });
    expect(parseFoundationExtension({ $value: "v" })).toEqual({ kind: "absent" });
    expect(parseFoundationExtension({ $extensions: {} })).toEqual({ kind: "absent" });
    expect(parseFoundationExtension({ $extensions: { "x.vendor": { a: 1 } } })).toEqual({ kind: "absent" });
    expect(parseFoundationExtension({ $extensions: { [NS]: { otherFeature: {} } } })).toEqual({ kind: "absent" });
    expect(parseFoundationExtension(null)).toEqual({ kind: "absent" });
    expect(parseFoundationExtension("x")).toEqual({ kind: "absent" });
  });

  it("válido primitive/semantic", () => {
    expect(parseFoundationExtension(ext("primitive"))).toEqual({ kind: "valid", level: "primitive" });
    expect(parseFoundationExtension(ext("semantic"))).toEqual({ kind: "valid", level: "semantic" });
  });

  it("propiedades futuras junto a level válido se conservan (sin invalidar)", () => {
    expect(parseFoundationExtension(ext("primitive", { futureProperty: "preserve" }))).toEqual({
      kind: "valid",
      level: "primitive",
    });
  });

  it("inválido: namespace/foundation no objeto, level ausente/no-string/no-soportado", () => {
    expect(parseFoundationExtension({ $extensions: { [NS]: "x" } })).toEqual({ kind: "invalid", reason: "namespace-not-object" });
    expect(parseFoundationExtension({ $extensions: { [NS]: null } })).toEqual({ kind: "invalid", reason: "namespace-not-object" });
    expect(parseFoundationExtension({ $extensions: { [NS]: [] } })).toEqual({ kind: "invalid", reason: "namespace-not-object" });
    expect(parseFoundationExtension({ $extensions: { [NS]: { foundation: "x" } } })).toEqual({ kind: "invalid", reason: "foundation-not-object" });
    expect(parseFoundationExtension({ $extensions: { [NS]: { foundation: {} } } })).toEqual({ kind: "invalid", reason: "level-missing" });
    expect(parseFoundationExtension(ext(1))).toEqual({ kind: "invalid", reason: "level-not-string" });
    for (const bad of ["unclassified", "core", "component", "Primitive", " primitive ", "SEMANTIC"]) {
      expect(parseFoundationExtension(ext(bad))).toEqual({ kind: "invalid", reason: "level-unsupported" });
    }
  });

  it("no muta la entrada congelada", () => {
    const node = deepFreeze(ext("primitive"));
    expect(() => parseFoundationExtension(node)).not.toThrow();
  });
});

// ── Resolver (T010) ──────────────────────────────────────────────────────────────────────────────
describe("resolveFoundationLevel (T010)", () => {
  it("token propio válido → token/null", () => {
    expect(resolveFoundationLevel({ kind: "valid", level: "semantic" }, "g.t", { declaration: { kind: "valid", level: "primitive" }, path: "g" }))
      .toEqual({ level: "semantic", source: "token", sourcePath: null, valid: true });
  });

  it("token propio inválido → unclassified/invalid/tokenPath (no hereda del grupo)", () => {
    expect(resolveFoundationLevel({ kind: "invalid", reason: "level-unsupported" }, "g.t", { declaration: { kind: "valid", level: "primitive" }, path: "g" }))
      .toEqual({ level: "unclassified", source: "invalid", sourcePath: "g.t", valid: false });
  });

  it("sin metadata propia + ancestro válido → group/groupPath", () => {
    expect(resolveFoundationLevel({ kind: "absent" }, "g.t", { declaration: { kind: "valid", level: "primitive" }, path: "g" }))
      .toEqual({ level: "primitive", source: "group", sourcePath: "g", valid: true });
  });

  it("sin metadata propia + ancestro inválido → unclassified/invalid/groupPath", () => {
    expect(resolveFoundationLevel({ kind: "absent" }, "g.t", { declaration: { kind: "invalid", reason: "level-unsupported" }, path: "g.mid" }))
      .toEqual({ level: "unclassified", source: "invalid", sourcePath: "g.mid", valid: false });
  });

  it("sin metadata y sin ancestro → unclassified/none/null", () => {
    expect(resolveFoundationLevel({ kind: "absent" }, "g.t", null))
      .toEqual({ level: "unclassified", source: "none", sourcePath: null, valid: true });
  });
});

// ── Pasada O(nodes) (T011) ───────────────────────────────────────────────────────────────────────
describe("projectFoundationMetadata (T011)", () => {
  it("documento ausente/null/no-objeto → proyección vacía (sin lanzar)", () => {
    for (const bad of [undefined, null, "x", 42, []]) {
      const p = projectFoundationMetadata(bad);
      expect(p.levels.size).toBe(0);
      expect(p.issues).toEqual([]);
    }
  });

  it("grupo primitive con varios tokens → todos primitive/group", () => {
    const doc = { color: { ...ext("primitive"), a: tok(), b: tok() } };
    const { levels, issues } = projectFoundationMetadata(doc);
    expect(issues).toEqual([]);
    expect(levels.get("color.a")).toEqual({ level: "primitive", source: "group", sourcePath: "color", valid: true });
    expect(levels.get("color.b")?.level).toBe("primitive");
  });

  it("override de token sobre grupo semantic → primitive/token", () => {
    const doc = { color: { ...ext("semantic"), raw: tok("primitive"), role: tok() } };
    const { levels } = projectFoundationMetadata(doc);
    expect(levels.get("color.raw")).toEqual({ level: "primitive", source: "token", sourcePath: null, valid: true });
    expect(levels.get("color.role")).toEqual({ level: "semantic", source: "group", sourcePath: "color", valid: true });
  });

  it("ancestro más cercano (3 niveles) gana", () => {
    const doc = { a: { ...ext("primitive"), b: { c: tok() } } };
    expect(projectFoundationMetadata(doc).levels.get("a.b.c")).toEqual({ level: "primitive", source: "group", sourcePath: "a", valid: true });
  });

  it("grupo intermedio inválido bloquea ancestro válido más lejano", () => {
    const doc = { a: { ...ext("primitive"), b: { ...ext("core"), c: tok() } } };
    const { levels, issues } = projectFoundationMetadata(doc);
    expect(levels.get("a.b.c")).toEqual({ level: "unclassified", source: "invalid", sourcePath: "a.b", valid: false });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "foundation-level-invalid", document: "tokens", path: "a.b", severity: "error" });
  });

  it("token con metadata inválida → 1 issue en el path del token", () => {
    const doc = { color: { x: tok("core") } };
    const { levels, issues } = projectFoundationMetadata(doc);
    expect(levels.get("color.x")).toEqual({ level: "unclassified", source: "invalid", sourcePath: "color.x", valid: false });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("color.x");
  });

  it("grupo inválido con 500 descendientes → exactamente 1 issue y 500 resoluciones invalid", () => {
    const group: Record<string, unknown> = { ...ext("core") };
    for (let i = 0; i < 500; i += 1) group[`t${i}`] = tok();
    const { levels, issues } = projectFoundationMetadata({ scale: group });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("scale");
    expect(levels.size).toBe(500);
    for (const r of levels.values()) {
      expect(r.level).toBe("unclassified");
      expect(r.source).toBe("invalid");
      expect(r.sourcePath).toBe("scale");
    }
  });

  it("props reservadas no se recorren ni generan paths", () => {
    const doc = { color: { $type: "color", $description: "d", $extensions: { [NS]: { foundation: { level: "primitive" } } }, a: tok() } };
    const { levels } = projectFoundationMetadata(doc);
    expect([...levels.keys()]).toEqual(["color.a"]);
    expect([...levels.keys()].some((k) => k.includes("$"))).toBe(false);
  });

  it("declaración foundation en la raíz aplica por herencia", () => {
    const doc = { ...ext("primitive"), color: { a: tok() } };
    expect(projectFoundationMetadata(doc).levels.get("color.a")).toEqual({ level: "primitive", source: "group", sourcePath: "", valid: true });
  });

  it("orden de tokens estable (orden de documento) y determinista", () => {
    const doc = { color: { a: tok(), b: tok() }, spacing: { c: tok() } };
    const first = [...projectFoundationMetadata(doc).levels.keys()];
    const second = [...projectFoundationMetadata(doc).levels.keys()];
    expect(first).toEqual(["color.a", "color.b", "spacing.c"]);
    expect(second).toEqual(first);
  });

  it("no muta el documento congelado (byte-idéntico)", () => {
    const doc = { color: { ...ext("primitive"), a: tok("semantic"), b: tok() } };
    const before = JSON.stringify(doc);
    deepFreeze(doc);
    expect(() => projectFoundationMetadata(doc)).not.toThrow();
    expect(JSON.stringify(doc)).toBe(before);
  });
});
