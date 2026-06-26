# Contract — ManagedDocumentReader (lectura segura, 002)

Puerto de aplicación para leer **solo** los documentos administrados, con límites y seguridad de
rutas. Implementado en infraestructura sobre `node:fs/promises` reutilizando el `path-guard` de `001`.

**Relación con `FileSystem` de `001` (C6)**: NO se introduce un segundo puerto de filesystem. El
puerto `FileSystem` de `001` se **extiende aditivamente** con un único método nuevo, `byteSize`
(stat de tamaño previo a la lectura); `lstatKind`/`readFile`/`realpath` ya existen y se reutilizan.
`ManagedDocumentReader` es un **puerto de aplicación delgado** (orientado a documentos administrados)
**compuesto sobre** ese `FileSystem` extendido —añade contención por `path-guard` y la política de
límites—; **no** es una segunda implementación de filesystem ni reimplementa el acceso a disco.

```ts
// FileSystem (001) extendido de forma aditiva — único método nuevo:
//   byteSize(path: string): Promise<number>;   // stat de tamaño antes de leer
// (lstatKind/readFile/realpath de 001 permanecen sin cambios)

interface ManagedDocumentReader {              // puerto delgado compuesto sobre FileSystem
  /** Tipo de la entrada (lstat; no sigue symlinks). Delega en FileSystem.lstatKind de 001. */
  lstatKind(absPath: string): Promise<ManagedFileKind>; // file|directory|symlink|other|absent
  /** Tamaño en bytes (stat) ANTES de leer. Delega en FileSystem.byteSize (método aditivo). */
  byteSize(absPath: string): Promise<number>;
  /** Lee UTF-8 si el tamaño ≤ límite; rechaza symlink externo / fuera de la raíz. */
  readManaged(rootDir: string, relativePath: string, maxBytes: number): Promise<ReadResult>;
}

type ReadResult =
  | { readonly ok: true; readonly content: string; readonly sizeBytes: number }
  | { readonly ok: false; readonly reason: "absent" | "not-regular-file" | "too-large"
      | "outside-root" | "symlink-external" | "read-failed"; readonly message: string };
```

## Reglas
- MUST validar contención con el path-guard (`realpath`, anti-`..`, rutas absolutas externas, prefijos
  engañosos, otros workspaces) y **rechazar symlinks externos** sin seguirlos.
- MUST hacer `stat` del tamaño antes de leer; si `> maxBytes` → `too-large` (no se lee).
- MUST NOT cargar módulos, evaluar/ejecutar contenido ni acceder a red.
- MUST NOT escribir ni alterar contenido/permisos/estructura. El parseo es `JSON.parse` en una capa
  superior (no en el reader).
- Bordes: archivo eliminado entre `lstat`/`byteSize` y lectura → `read-failed`; encoding inválido →
  lo detecta el parseo posterior (no el reader); permisos → `read-failed`.
