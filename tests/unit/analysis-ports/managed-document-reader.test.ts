// T016 — ManagedDocumentReader: input/result discriminado; éxito y fallos; sin métodos de escritura.
import { describe, expect, it } from "vitest";
import type {
  ManagedDocumentReadResult,
  ReadableManagedDocument,
} from "../../../src/application/analysis-ports.js";
import { ScriptedDocumentReader } from "../../helpers/analysis-fakes.js";

function reader(entries: Array<[ReadableManagedDocument, ManagedDocumentReadResult]>): ScriptedDocumentReader {
  return new ScriptedDocumentReader(new Map(entries));
}

describe("ManagedDocumentReader (T016)", () => {
  it("resultado exitoso lleva document/relativePath/content/sizeBytes", async () => {
    const r = reader([
      [
        "config",
        { ok: true, document: "config", relativePath: "neuraz-ds.config.json", content: "{}", sizeBytes: 2 },
      ],
    ]);
    const res = await r.read({
      rootDir: "/repo",
      document: "config",
      relativePath: "neuraz-ds.config.json",
      maxBytes: 5 * 1024 * 1024,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.document).toBe("config");
      expect(res.content).toBe("{}");
      expect(res.sizeBytes).toBe(2);
    }
    // Registra la petición (orden/inputs verificables).
    expect(r.requests).toHaveLength(1);
    expect(r.requests[0]?.maxBytes).toBe(5 * 1024 * 1024);
  });

  it("distingue cada fallo esperado mediante reason (no excepciones)", async () => {
    const reasons = [
      "absent",
      "not-regular-file",
      "too-large",
      "outside-root",
      "symlink-external",
      "read-failed",
    ] as const;
    for (const reason of reasons) {
      const r = reader([["tokens", { ok: false, reason, message: reason }]]);
      const res = await r.read({
        rootDir: "/repo",
        document: "tokens",
        relativePath: "design-system/tokens/base.tokens.json",
        maxBytes: 10,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe(reason);
    }
  });

  it("documento sin resultado programado ⇒ ausente (flujo normal, no throw)", async () => {
    const r = reader([]);
    const res = await r.read({
      rootDir: "/repo",
      document: "manifest",
      relativePath: "design-system/design-system.json",
      maxBytes: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("absent");
  });

  it("el puerto NO expone métodos de escritura/filesystem", () => {
    const r = reader([]);
    const surface = r as unknown as Record<string, unknown>;
    expect(typeof surface.read).toBe("function");
    for (const forbidden of ["writeFileExclusive", "rename", "removeFile", "mkdir", "realpath"]) {
      expect(surface[forbidden]).toBeUndefined();
    }
  });
});
