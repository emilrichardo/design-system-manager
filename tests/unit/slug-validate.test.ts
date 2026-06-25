import { describe, expect, it } from "vitest";
import { createSlug, isValidSlug } from "../../src/domain/identity/slug.js";

const VALID = ["mpf-design-system", "neuraz", "municipal-ui-2026"];
const INVALID = [
  "MPF Design System",
  "mpf_design_system",
  "-mpf",
  "mpf-",
  "mpf--design",
  "../design-system",
  "design/system",
  "design.system",
  ".",
  "..",
];

describe("slug validation (T009, ADR-0003)", () => {
  it.each(VALID)("acepta el slug válido %s", (s) => {
    expect(isValidSlug(s)).toBe(true);
    const r = createSlug(s);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.value).toBe(s);
  });

  it.each(INVALID)("rechaza el slug inválido %s", (s) => {
    expect(isValidSlug(s)).toBe(false);
    const r = createSlug(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("slug-invalid");
  });
});
