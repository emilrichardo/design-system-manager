import { describe, expect, it } from "vitest";
import { serializeTypeScriptLiteral } from "../../../src/infrastructure/build-export/ts-literal.js";

function ok(value: unknown): string {
  const result = serializeTypeScriptLiteral(value, "token.path");
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.text;
}

describe("typescript literal serializer (T062)", () => {
  it("escapa strings para literales TypeScript sin HTML escaping genérico", () => {
    expect(ok("")).toBe("\"\"");
    expect(ok("quote \" and slash \\")).toBe("\"quote \\\" and slash \\\\\"");
    expect(ok("line\ncarriage\rtab\tback\bform\f")).toBe("\"line\\ncarriage\\rtab\\tback\\bform\\f\"");
    expect(ok("c0\u0001\u001f")).toBe("\"c0\\u0001\\u001f\"");
    expect(ok("unicode á水")).toBe("\"unicode á水\"");
    expect(ok("\u2028\u2029")).toBe("\"\\u2028\\u2029\"");
    expect(ok("</script><div>")).toBe("\"<\\/script><div>\"");
    expect(ok("\uD800")).toBe("\"\\ud800\"");
  });

  it("serializa escalares, arrays y objetos JSON-safe con orden de propiedades de entrada", () => {
    expect(ok(42)).toBe("42");
    expect(ok(0.875)).toBe("0.875");
    expect(ok(-0)).toBe("0");
    expect(ok(1e21)).toBe("1e+21");
    expect(ok(true)).toBe("true");
    expect(ok(false)).toBe("false");
    expect(ok(null)).toBe("null");
    expect(ok(["a", 1, false, null])).toBe("[\"a\",1,false,null]");
    expect(ok({ b: 2, a: { z: "last", y: [1, 2] } })).toBe("{\"b\":2,\"a\":{\"z\":\"last\",\"y\":[1,2]}}");
  });

  it("rechaza valores no JSON-safe antes de producir texto", () => {
    const invalidValues: readonly unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1n,
      Symbol("x"),
      () => null,
      new Date("2026-01-01T00:00:00Z"),
      Object.assign([1, 2], { extra: true }),
      Object.assign(Object.create(null), { ok: "value", [Symbol("s")]: "hidden" }),
    ];

    for (const value of invalidValues) {
      const result = serializeTypeScriptLiteral(value, "token.path");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatchObject({ code: "typescript-literal-invalid", tokenPath: "token.path" });
      }
    }
  });

  it("rechaza ciclos, arrays sparse, instancias y accessors", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse = [1, , 3];
    const withGetter = Object.defineProperty({}, "x", { enumerable: true, get: () => "nope" });

    for (const value of [cyclic, sparse, new Map(), withGetter]) {
      const result = serializeTypeScriptLiteral(value, "broken.token");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain("broken.token");
    }
  });
});
