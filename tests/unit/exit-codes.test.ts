import { describe, expect, it } from "vitest";
import { exitCodeForResult } from "../../src/cli/exit-codes.js";
import { cancelled, conflict, created, failed, unchanged } from "../../src/domain/result/initialization-result.js";

describe("exitCodeForResult (T044)", () => {
  it("mapea los ocho resultados al código contractual", () => {
    expect(exitCodeForResult(created(["a"]))).toBe(0);
    expect(exitCodeForResult(cancelled())).toBe(1);
    expect(exitCodeForResult(unchanged("design-system"))).toBe(2);
    expect(exitCodeForResult(failed("validation", []))).toBe(3);
    expect(exitCodeForResult(conflict(["x"]))).toBe(4);
    expect(exitCodeForResult(failed("host", []))).toBe(5);
    expect(exitCodeForResult(failed("filesystem", []))).toBe(6);
    expect(exitCodeForResult(failed("post-verify", []))).toBe(7);
  });
});
