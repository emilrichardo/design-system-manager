import { describe, expect, it } from "vitest";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

const input = { executionDir: "/host" };

describe("initializeDesignSystem (T037)", () => {
  it("estado none + confirmación → created, una sola transacción, orden correcto", async () => {
    const trace: string[] = [];
    const built = buildDeps({ trace, tx: { status: "committed", files: ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"] } });
    const result = await initializeDesignSystem(input, built.deps);

    expect(result.status).toBe("created");
    expect(built.writer.commitCalls).toBe(1);
    expect(built.prompter.requestIdentityCalls).toBe(1);
    expect(built.prompter.confirmCalls).toBe(1);
    expect(built.reporter.events).toEqual(["hostResolved", "previousStateDetected", "planPrepared", "completed"]);
    // Orden observable entre colaboradores.
    expect(trace).toEqual([
      "resolve",
      "report:host",
      "classify",
      "prompt:identity",
      "prompt:confirm",
      "commit",
      "report:completed",
    ]);
    expect(built.prompter.lastSuggestedSlug).toBe("acme-design-system");
  });

  it("host inválido → failed/host, sin clasificar ni prompts ni transacción", async () => {
    const built = buildDeps({ resolution: { ok: false, error: { code: "package-json-missing", message: "falta package.json" } } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("host");
    expect(built.classifier.calls).toBe(0);
    expect(built.prompter.requestIdentityCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("cancelación en identidad → cancelled, sin confirmar ni transacción", async () => {
    const built = buildDeps({ identity: { kind: "cancelled" } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("cancelled");
    expect(built.prompter.confirmCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("rechazo en confirmación → cancelled, cero transacción (cero efectos persistentes)", async () => {
    const built = buildDeps({ confirm: { kind: "answered", value: false } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("cancelled");
    expect(built.writer.commitCalls).toBe(0);
  });

  it("cancelación en confirmación → cancelled", async () => {
    const built = buildDeps({ confirm: { kind: "cancelled" } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("cancelled");
    expect(built.writer.commitCalls).toBe(0);
  });

  it("slug manual inválido → failed/validation, sin confirmar ni transacción", async () => {
    const built = buildDeps({ identity: { kind: "answered", value: { name: "Acme", slug: "Bad Slug", version: "0.1.0" } } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("validation");
    expect(built.prompter.confirmCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("versión inválida → failed/validation", async () => {
    const built = buildDeps({ identity: { kind: "answered", value: { name: "Acme", slug: "acme", version: "v1" } } });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("validation");
    expect(built.writer.commitCalls).toBe(0);
  });

  it("mapeo TransactionResult → InitializationResult", async () => {
    const committed = await initializeDesignSystem(input, buildDeps({ tx: { status: "committed", files: ["a"] } }).deps);
    expect(committed.status).toBe("created");

    const confl = await initializeDesignSystem(input, buildDeps({ tx: { status: "conflict", conflicts: ["x"] } }).deps);
    expect(confl.status).toBe("conflict");

    const fsFail = await initializeDesignSystem(input, buildDeps({ tx: { status: "failed", category: "filesystem", errors: [{ code: "e", message: "m" }] } }).deps);
    expect(fsFail.status === "failed" && fsFail.category).toBe("filesystem");

    const pv = await initializeDesignSystem(input, buildDeps({ tx: { status: "failed", category: "post-verify", errors: [{ code: "e", message: "m" }], rollbackErrors: [{ code: "r", message: "rb" }] } }).deps);
    expect(pv.status === "failed" && pv.category).toBe("post-verify");
    if (pv.status === "failed") expect(pv.errors.length).toBe(2); // errores + rollbackErrors preservados
  });

  it("un reporter que falla no altera el resultado created", async () => {
    const built = buildDeps({ reporterThrows: true });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("created");
  });
});
