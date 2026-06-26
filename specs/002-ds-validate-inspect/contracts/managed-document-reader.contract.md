# Contract — ManagedDocumentReader (lectura segura, 002)

Puerto de aplicación para leer **solo** los documentos administrados, con límites y seguridad de
rutas. Implementado en infraestructura sobre `node:fs/promises` reutilizando el `path-guard` de `001`.
Extiende el puerto `FileSystem` de `001` de forma **aditiva** con `byteSize`.

```ts
interface ManagedDocumentReader {
  /** Tipo de la entrada (lstat; no sigue symlinks). Reusa lstatKind de 001. */
  lstatKind(absPath: string): Promise<ManagedFileKind>; // file|directory|symlink|other|absent
  /** Tamaño en bytes (stat) ANTES de leer, para aplicar el límite de tamaño. */
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
