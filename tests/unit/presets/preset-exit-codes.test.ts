import { describe, expect, it } from "vitest";
import { exitCodeForOutcome, exitCodeForPresetOutcome, exitCodeForResult, INTERNAL_ERROR_EXIT } from "../../../src/cli/exit-codes.js";

describe("preset exit codes", () => {
  it("mapea outcomes de preset sin modificar las tablas 001-004", () => {
    expect(exitCodeForPresetOutcome("success")).toBe(0);
    expect(exitCodeForPresetOutcome("applied")).toBe(0);
    expect(exitCodeForPresetOutcome("unchanged")).toBe(2);
    expect(exitCodeForPresetOutcome("invalid-preset")).toBe(3);
    expect(exitCodeForPresetOutcome("conflict")).toBe(4);
    expect(exitCodeForPresetOutcome("not-found")).toBe(5);
    expect(exitCodeForPresetOutcome("read-error")).toBe(6);
    expect(exitCodeForPresetOutcome("write-error")).toBe(6);
    expect(exitCodeForPresetOutcome("verification-error")).toBe(7);
    expect(exitCodeForPresetOutcome("internal-error")).toBe(INTERNAL_ERROR_EXIT);

    expect(exitCodeForOutcome("valid")).toBe(0);
    expect(exitCodeForOutcome("partial")).toBe(4);
    expect(exitCodeForResult({ status: "unchanged", reason: "design-system" })).toBe(2);
  });
});
