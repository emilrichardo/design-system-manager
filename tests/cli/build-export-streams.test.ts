// T107 (006) — Matriz de streams: build humano (success/unchanged → stdout; error → stderr); build
// JSON (un envelope a stdout; internal-error a stderr); export success (bytes exactos a stdout, stderr
// vacío); export error (stdout vacío, stderr seguro); internal-error. Sin envelope JSON para export.
import { describe, expect, it } from "vitest";
import { BuildTerminalReporter } from "../../src/infrastructure/reporter/build-terminal-reporter.js";
import { BuildJsonReporter } from "../../src/infrastructure/reporter/build-json-reporter.js";
import { ExportReporter } from "../../src/infrastructure/reporter/export-error-reporter.js";
import { bufferExportOutput, bufferIO, buildResult, exportFailure, exportSuccess } from "../infrastructure/reporter/build-reporter-fixtures.js";

describe("build/export streams (T107)", () => {
  it("build humano success → stdout reporte, stderr vacío", () => {
    const io = bufferIO();
    new BuildTerminalReporter(io).completed(buildResult("built"));
    expect(io.outText).toContain("Build: built");
    expect(io.errText).toBe("");
  });

  it("build humano unchanged → stdout, stderr vacío", () => {
    const io = bufferIO();
    new BuildTerminalReporter(io).completed(buildResult("unchanged"));
    expect(io.outText).toContain("Build: unchanged");
    expect(io.errText).toBe("");
  });

  it("build humano error esperado (conflict) → stdout vacío, stderr reporte", () => {
    const io = bufferIO();
    new BuildTerminalReporter(io).completed(buildResult("conflict"));
    expect(io.outText).toBe("");
    expect(io.errText).toContain("Build: conflict");
    expect(io.errText).toContain("required-path-owned-by-unknown");
  });

  it("build humano verification-error → stderr con nota de recovery y backup relativo", () => {
    const io = bufferIO();
    new BuildTerminalReporter(io).completed(buildResult("verification-error"));
    expect(io.outText).toBe("");
    expect(io.errText).toContain("recovery is required");
    expect(io.errText).toContain(".neuraz-build-backup");
    expect(io.errText).not.toContain("/Volumes/");
  });

  it("build JSON success → un único envelope en stdout, stderr vacío", () => {
    const io = bufferIO();
    new BuildJsonReporter(io).completed(buildResult("built"));
    expect(io.errText).toBe("");
    expect(() => JSON.parse(io.outText)).not.toThrow();
    expect(JSON.parse(io.outText)).toMatchObject({ formatVersion: "1.0.0", command: "build", outcome: "built" });
  });

  it("build JSON internal-error → envelope en stderr, stdout vacío", () => {
    const io = bufferIO();
    new BuildJsonReporter(io).internalError();
    expect(io.outText).toBe("");
    expect(JSON.parse(io.errText)).toMatchObject({ command: "build", outcome: "internal-error" });
  });

  it("export success → bytes exactos a stdout, stderr vacío, sin envelope JSON", () => {
    const bytes = new TextEncoder().encode(":root {\n  --color-a: #111111;\n}\n");
    const io = bufferExportOutput();
    new ExportReporter(io).completed(exportSuccess("css", bytes));
    expect(io.artifact).toEqual(bytes);
    expect(io.errText).toBe("");
    // No es un envelope JSON: son los bytes crudos del artifact.
    expect(new TextDecoder().decode(io.artifact!)).toBe(":root {\n  --color-a: #111111;\n}\n");
  });

  it("export error esperado → stdout (artifact) vacío, stderr seguro", () => {
    const io = bufferExportOutput();
    new ExportReporter(io).completed(exportFailure("not-found"));
    expect(io.artifact).toBeNull();
    expect(io.errText).toContain("not-found");
    expect(io.errText).not.toContain("/Volumes/");
  });

  it("export internal-error → stderr seguro, stdout vacío", () => {
    const io = bufferExportOutput();
    new ExportReporter(io).internalError();
    expect(io.artifact).toBeNull();
    expect(io.errText).toContain("internal-error");
  });

  it("export success no agrega newline ni metadata extra a los bytes", () => {
    const bytes = new TextEncoder().encode("export const tokens = {} as const;\n");
    const io = bufferExportOutput();
    new ExportReporter(io).completed(exportSuccess("typescript", bytes));
    expect(io.artifact).toEqual(bytes);
    expect(io.artifact!.length).toBe(bytes.length);
  });
});
