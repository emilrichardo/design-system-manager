// T015 — Extensión aditiva de FileSystem con byteSize (opcional). 001 sigue compatible.
import { describe, expect, it } from "vitest";
import type { FileSystem } from "../../../src/application/ports.js";
import { InMemoryFileSystem } from "../../helpers/in-memory-adapters.js";

describe("FileSystem.byteSize (T015, aditivo)", () => {
  it("el InMemoryFileSystem de 001 sigue siendo un FileSystem válido (sin byteSize)", async () => {
    const fs: FileSystem = new InMemoryFileSystem();
    // Semántica de métodos existentes intacta:
    expect(await fs.lstatKind("/nope")).toBe("absent");
    await fs.writeFileExclusive("/a", "x");
    expect(await fs.readFile("/a")).toBe("x");
    // byteSize es opcional: ausente en el adapter de 001.
    expect(fs.byteSize).toBeUndefined();
  });

  it("un FileSystem que SÍ implementa byteSize es asignable al puerto y devuelve un number", async () => {
    const withSize: FileSystem = Object.assign(new InMemoryFileSystem(), {
      byteSize: async (path: string) => path.length,
    });
    expect(typeof withSize.byteSize).toBe("function");
    expect(await withSize.byteSize?.("abcd")).toBe(4);
  });
});
