// T015/T021 — FileSystem.byteSize (obligatorio desde T021). 001 sigue compatible.
import { describe, expect, it } from "vitest";
import type { FileSystem } from "../../../src/application/ports.js";
import { InMemoryFileSystem } from "../../helpers/in-memory-adapters.js";

describe("FileSystem.byteSize (T021, obligatorio)", () => {
  it("el InMemoryFileSystem de 001 implementa byteSize (bytes UTF-8, no caracteres)", async () => {
    const fs: FileSystem = new InMemoryFileSystem();
    // Semántica de métodos existentes intacta:
    expect(await fs.lstatKind("/nope")).toBe("absent");
    await fs.writeFileExclusive("/a", "x");
    expect(await fs.readFile("/a")).toBe("x");
    // byteSize disponible y correcto:
    expect(typeof fs.byteSize).toBe("function");
    expect(await fs.byteSize("/a")).toBe(1);
  });

  it("byteSize cuenta bytes UTF-8 (carácter multibyte) y archivo vacío", async () => {
    const fs = new InMemoryFileSystem();
    await fs.writeFileExclusive("/empty", "");
    await fs.writeFileExclusive("/euro", "€"); // U+20AC = 3 bytes UTF-8
    expect(await fs.byteSize("/empty")).toBe(0);
    expect(await fs.byteSize("/euro")).toBe(3);
  });

  it("byteSize lanza (estructurable) para ruta inexistente", async () => {
    const fs = new InMemoryFileSystem();
    await expect(fs.byteSize("/missing")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
