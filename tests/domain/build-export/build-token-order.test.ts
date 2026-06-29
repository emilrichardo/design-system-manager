// T020 (006) — Comparador canónico: categoría → padres antes que descendientes → code points; sin locale.
import { describe, expect, it } from "vitest";
import { compareTokenPath, orderCanonical, type OrderableToken } from "../../../src/domain/build-export/build-token-order.js";

describe("compareTokenPath (T015)", () => {
  it("padres antes que descendientes y siblings por code point", () => {
    const paths = ["b", "a.c", "a.b.c", "a.b", "a"];
    const sorted = [...paths].sort(compareTokenPath);
    expect(sorted).toEqual(["a", "a.b", "a.b.c", "a.c", "b"]);
  });
  it("ordena por code point (mayúsculas antes que minúsculas), sin localeCompare", () => {
    expect(compareTokenPath("color.A", "color.a")).toBeLessThan(0); // 'A'(65) < 'a'(97)
    expect(["color.a", "color.A", "color.B"].sort(compareTokenPath)).toEqual(["color.A", "color.B", "color.a"]);
  });
});

describe("orderCanonical (T015)", () => {
  const tok = (category: OrderableToken["category"], path: string): OrderableToken => ({ category, path });

  it("ordena por categoría canónica y deja null al final; no muta la entrada", () => {
    const input: OrderableToken[] = [
      tok(null, "z.unmanaged"),
      tok("spacing", "spacing.100"),
      tok("color", "color.gray.100"),
      tok("color", "color.gray.50"),
    ];
    const snapshot = [...input];
    const out = orderCanonical(input);
    expect(out.map((t) => t.path)).toEqual(["color.gray.100", "color.gray.50", "spacing.100", "z.unmanaged"]);
    expect(input).toEqual(snapshot); // entrada no mutada
  });

  it("es determinista para el mismo conjunto en distinto insertion order", () => {
    const a = orderCanonical([tok("color", "color.b"), tok("color", "color.a")]);
    const b = orderCanonical([tok("color", "color.a"), tok("color", "color.b")]);
    expect(a.map((t) => t.path)).toEqual(b.map((t) => t.path));
  });
});
