// Tipo de entrada de filesystem a nivel de dominio (pura). Comparte literales con el `ManagedFileKind`
// de la capa de aplicación de `001` (estructuralmente compatible), pero el dominio NO importa
// application/infrastructure; por eso se declara aquí de forma independiente.
export type FileKind = "file" | "directory" | "symlink" | "other" | "absent";
