// Mapper puro ManagedFileKind (application/infra) → FileKind (domain). Vive en infraestructura para
// no forzar al dominio a importar aplicación. Los literales coinciden, por lo que el mapeo es total
// y explícito (sin pérdida ni imports invertidos).
import type { ManagedFileKind } from "../../application/ports.js";
import type { FileKind } from "../../domain/analysis/file-kind.js";

export function toDomainFileKind(kind: ManagedFileKind): FileKind {
  switch (kind) {
    case "file":
      return "file";
    case "directory":
      return "directory";
    case "symlink":
      return "symlink";
    case "other":
      return "other";
    case "absent":
      return "absent";
  }
}
