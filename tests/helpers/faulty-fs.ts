// Adapter FileSystem que inyecta un fallo en la N-ésima llamada de una operación, envolviendo
// un FileSystem base (normalmente nodeFileSystem). Evita librerías de mocking de filesystem.
import type { FileSystem } from "../../src/application/ports.js";

type Op = keyof FileSystem;

export interface FaultConfig {
  /** Operación en la que fallar. */
  readonly op: Op;
  /** Falla en la llamada número (afterCalls + 1). 0 = primera llamada. */
  readonly afterCalls?: number;
  /** Código de error simulado (e.g. "EACCES"). */
  readonly code?: string;
}

export function faultyFs(base: FileSystem, fault: FaultConfig): FileSystem {
  const counts = new Map<Op, number>();
  const trip = (op: Op): void => {
    const n = (counts.get(op) ?? 0) + 1;
    counts.set(op, n);
    if (op === fault.op && n > (fault.afterCalls ?? 0)) {
      const e = new Error(`fallo inyectado en ${op} (llamada ${n})`) as Error & { code?: string };
      e.code = fault.code ?? "EFAULT";
      throw e;
    }
  };
  return {
    lstatKind: (p) => (trip("lstatKind"), base.lstatKind(p)),
    mkdir: (p, r) => (trip("mkdir"), base.mkdir(p, r)),
    mkdtemp: (p) => (trip("mkdtemp"), base.mkdtemp(p)),
    readFile: (p) => (trip("readFile"), base.readFile(p)),
    writeFileExclusive: (p, c) => (trip("writeFileExclusive"), base.writeFileExclusive(p, c)),
    rename: (f, t) => (trip("rename"), base.rename(f, t)),
    removeFile: (p) => (trip("removeFile"), base.removeFile(p)),
    removeDir: (p) => (trip("removeDir"), base.removeDir(p)),
    removeTree: (p) => (trip("removeTree"), base.removeTree(p)),
    realpath: (p) => (trip("realpath"), base.realpath(p)),
  };
}
