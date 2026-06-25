// Comprobación LÉXICA (pura, sin Node) de que una ruta es relativa y no escapa del límite.
// Complementa al path-guard de infraestructura (que usa realpath); aquí solo reglas de cadena
// para validar p. ej. `designSystemDir` de la configuración antes de cualquier acceso al FS.
export function isSafeRelativePosixPath(p: string): boolean {
  if (typeof p !== "string" || p.length === 0) return false;
  if (p.includes("\\")) return false; // backslashes no permitidos (no portable)
  if (p.startsWith("/")) return false; // absoluta POSIX
  if (/^[A-Za-z]:/.test(p)) return false; // absoluta tipo Windows (C:)
  const segments = p.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") return false;
  }
  return true;
}
