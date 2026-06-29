// T029 (006) — Detección global de colisiones: `foo.bar-baz` y `foo-bar.baz` mapean a `--foo-bar-baz`
// y deben fallar de forma tipada sin elegir uno; bytes-deterministas en el orden de colisiones.
import { describe, expect, it } from "vitest";
import { buildCssNameMap } from "../../../src/domain/build-export/css-name.js";

describe("buildCssNameMap (T028)", () => {
  it("dos paths que colisionan en --foo-bar-baz son rechazados sin elegir silenciosamente", () => {
    const r = buildCssNameMap(["foo.bar-baz", "foo-bar.baz"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.collisions).toHaveLength(1);
    expect(r.collisions[0]!.name).toBe("--foo-bar-baz");
    expect([...r.collisions[0]!.tokenPaths].sort()).toEqual(["foo-bar.baz", "foo.bar-baz"]);
    expect(r.invalidNames).toHaveLength(0);
  });

  it("tres paths colisionando se reportan todos", () => {
    const r = buildCssNameMap(["a.b-c", "a-b.c", "a-b-c"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.collisions[0]!.name).toBe("--a-b-c");
    expect(r.collisions[0]!.tokenPaths).toHaveLength(3);
  });

  it("es independiente del insertion order: misma colisión detectada con orden inverso", () => {
    const a = buildCssNameMap(["foo.bar-baz", "foo-bar.baz"]);
    const b = buildCssNameMap(["foo-bar.baz", "foo.bar-baz"]);
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    if (a.ok || b.ok) return;
    expect(a.collisions[0]!.tokenPaths).toEqual(b.collisions[0]!.tokenPaths);
  });

  it("case diferente NO colisiona (los bytes del nombre difieren)", () => {
    const r = buildCssNameMap(["color.A100", "color.a100"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.byPath.get("color.A100")).toBe("--color-A100");
    expect(r.byPath.get("color.a100")).toBe("--color-a100");
  });

  it("sin colisiones y sin inválidos: devuelve byPath completo en orden estable", () => {
    const r = buildCssNameMap(["color.gray.100", "spacing.100"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.byPath.size).toBe(2);
    expect(r.byPath.get("color.gray.100")).toBe("--color-gray-100");
    expect(r.byPath.get("spacing.100")).toBe("--spacing-100");
  });

  it("nombres inválidos NO se incluyen en byPath y se reportan", () => {
    const r = buildCssNameMap(["color.ok", "color.bad space"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.invalidNames).toHaveLength(1);
    expect(r.invalidNames[0]!.tokenPath).toBe("color.bad space");
  });

  it("ordena colisiones por nombre de forma determinista", () => {
    const r = buildCssNameMap(["z.a-b", "z-a.b", "a.b-c", "a-b.c"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.collisions.map((c) => c.name)).toEqual(["--a-b-c", "--z-a-b"]);
  });
});
