// T041 (004) - Factories de composicion para foundations.
import { describe, expect, it, vi } from "vitest";
import {
  createFoundationsDependencies,
  createFoundationsJsonDependencies,
} from "../../../src/cli/composition.js";
import { FoundationsTerminalReporter } from "../../../src/infrastructure/reporter/foundations-terminal-reporter.js";
import { FoundationsJsonReporter } from "../../../src/infrastructure/reporter/foundations-json-reporter.js";

const io = { out: vi.fn(), err: vi.fn() };
const analyze = vi.fn();

describe("composición foundations (T041)", () => {
  it("createFoundationsDependencies usa FoundationsTerminalReporter y el mismo analyze", () => {
    const deps = createFoundationsDependencies(io, analyze);
    expect(deps.reporter).toBeInstanceOf(FoundationsTerminalReporter);
    expect(deps.analyze).toBe(analyze);
  });

  it("createFoundationsJsonDependencies usa FoundationsJsonReporter y el mismo analyze", () => {
    const deps = createFoundationsJsonDependencies(io, analyze);
    expect(deps.reporter).toBeInstanceOf(FoundationsJsonReporter);
    expect(deps.analyze).toBe(analyze);
  });
});
