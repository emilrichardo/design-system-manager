// T020 (003) — Factories de composición en modo JSON: reporter JSON, mismo analyze enlazado.
import { describe, expect, it, vi } from "vitest";
import {
  createInspectJsonDependencies,
  createValidateJsonDependencies,
} from "../../../src/cli/composition.js";
import { ValidateJsonReporter } from "../../../src/infrastructure/reporter/validate-json-reporter.js";
import { InspectJsonReporter } from "../../../src/infrastructure/reporter/inspect-json-reporter.js";

const io = { out: vi.fn(), err: vi.fn() };
const analyze = vi.fn();

describe("composición JSON (T020)", () => {
  it("createValidateJsonDependencies usa ValidateJsonReporter y el mismo analyze", () => {
    const deps = createValidateJsonDependencies(io, analyze);
    expect(deps.reporter).toBeInstanceOf(ValidateJsonReporter);
    expect(deps.analyze).toBe(analyze);
  });

  it("createInspectJsonDependencies usa InspectJsonReporter y el mismo analyze", () => {
    const deps = createInspectJsonDependencies(io, analyze);
    expect(deps.reporter).toBeInstanceOf(InspectJsonReporter);
    expect(deps.analyze).toBe(analyze);
  });
});
