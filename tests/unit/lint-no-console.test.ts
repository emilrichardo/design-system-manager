import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/arch-guard.mjs";

// T004: el guard arquitectónico no debe reportar violaciones en el código actual,
// y debe detectar `console.*`/imports prohibidos si se introdujeran en domain/application.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

describe("arch-guard (console + imports en domain/application)", () => {
  it("no encuentra violaciones en el código de bootstrap", async () => {
    const violations = await findViolations(ROOT);
    expect(violations).toEqual([]);
  });

  it("expone una función de detección reutilizable", () => {
    expect(findViolations).toBeTypeOf("function");
  });
});
