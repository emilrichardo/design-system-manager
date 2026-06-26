// T023/§12 — Mapper ManagedFileKind → FileKind (domain), exhaustivo, sin imports invertidos.
import { describe, expect, it } from "vitest";
import type { ManagedFileKind } from "../../../src/application/ports.js";
import type { FileKind } from "../../../src/domain/analysis/file-kind.js";
import { toDomainFileKind } from "../../../src/infrastructure/analysis/file-kind-mapper.js";

describe("toDomainFileKind", () => {
  it("mapea todas las clases de archivo", () => {
    const cases: ReadonlyArray<[ManagedFileKind, FileKind]> = [
      ["file", "file"],
      ["directory", "directory"],
      ["symlink", "symlink"],
      ["other", "other"],
      ["absent", "absent"],
    ];
    for (const [input, expected] of cases) {
      expect(toDomainFileKind(input)).toBe(expected);
    }
  });
});
