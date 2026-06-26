import { describe, expect, it } from "vitest";
import { TerminalReporter, type OutputWriter } from "../../src/infrastructure/reporter/terminal-reporter.js";
import { cancelled, conflict, created, failed, unchanged } from "../../src/domain/result/initialization-result.js";
import { completeValidState, createPartialState } from "../../src/domain/state/previous-state.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { validHostRoot } from "../helpers/in-memory-adapters.js";
import type { InitializationSummary } from "../../src/application/ports.js";

function captured(): { io: OutputWriter; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
}

const summary: InitializationSummary = {
  hostRoot: validHostRoot("/repo"),
  identity: { name: "Acme", slug: "acme", version: "0.1.0", description: "d" },
  files: [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens],
  conflicts: [],
};

describe("TerminalReporter (T042/T046)", () => {
  it("hostResolved muestra la raíz anfitriona en stdout", () => {
    const c = captured();
    new TerminalReporter(c.io).hostResolved(validHostRoot("/repo"));
    expect(c.out.join("")).toContain("Raíz anfitriona: /repo");
  });

  it("planPrepared muestra nombre, slug, versión, archivos y raíz", () => {
    const c = captured();
    new TerminalReporter(c.io).planPrepared(summary);
    const text = c.out.join("");
    expect(text).toContain("Acme");
    expect(text).toContain("acme");
    expect(text).toContain("0.1.0");
    expect(text).toContain(MANAGED_FILES.tokens);
    expect(text).toContain("/repo");
    expect(text).toContain("Conflictos: ninguno");
  });

  it("created → stdout con archivos", () => {
    const c = captured();
    new TerminalReporter(c.io).completed(created([MANAGED_FILES.config]));
    expect(c.out.join("")).toContain(MANAGED_FILES.config);
    expect(c.err.join("")).toBe("");
  });

  it("unchanged → stdout con ubicación", () => {
    const c = captured();
    new TerminalReporter(c.io).completed(unchanged("design-system"));
    expect(c.out.join("")).toContain("design-system");
  });

  it("cancelled → stdout sin cambios", () => {
    const c = captured();
    new TerminalReporter(c.io).completed(cancelled());
    expect(c.out.join("")).toContain("cancelada");
  });

  it("partial: conflict en stderr con presentes y ausentes del estado previo", () => {
    const c = captured();
    const reporter = new TerminalReporter(c.io);
    const partial = createPartialState([MANAGED_FILES.config], [MANAGED_FILES.manifest, MANAGED_FILES.tokens]);
    if (!partial.ok) throw new Error("fixture");
    reporter.previousStateDetected(partial.value);
    reporter.completed(conflict([MANAGED_FILES.config]));
    const errText = c.err.join("");
    expect(errText).toContain("Presentes:");
    expect(errText).toContain(MANAGED_FILES.config);
    expect(errText).toContain("Ausentes");
    expect(errText).toContain(MANAGED_FILES.manifest);
  });

  it("failed: categoría y errores en stderr", () => {
    const c = captured();
    new TerminalReporter(c.io).completed(failed("post-verify", [{ code: "x", message: "boom", path: "p" }]));
    const errText = c.err.join("");
    expect(errText).toContain("post-verify");
    expect(errText).toContain("boom");
  });

  it("completeValidState no produce salida en previousStateDetected", () => {
    const c = captured();
    new TerminalReporter(c.io).previousStateDetected(completeValidState("design-system"));
    expect(c.out.join("")).toBe("");
  });
});
