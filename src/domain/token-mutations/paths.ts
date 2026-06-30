// T004 (008) — Validación y helpers de paths lógicos de token (`a.b.c`). Dominio puro. Un path es seguro
// si no está vacío, no tiene segmentos vacíos, no usa claves reservadas DTCG (`$type`, `$value`, …) como
// segmento, y no contiene traversal ni separadores de filesystem.

const RESERVED_SEGMENT = /^\$/; // claves DTCG (`$type`, `$value`, `$description`, `$extensions`, …)

/** ¿Es `path` un path lógico de token seguro? */
export function isSafeTokenPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("/") || value.includes("\\") || value.includes("\0")) return false;
  const segments = value.split(".");
  return segments.every((s) => s.length > 0 && s !== "." && s !== ".." && !RESERVED_SEGMENT.test(s));
}

/** Segmentos del path (`a.b.c` → `["a","b","c"]`). */
export function segments(path: string): string[] {
  return path.split(".");
}

/** Último segmento (nombre). */
export function lastSegment(path: string): string {
  const s = segments(path);
  return s[s.length - 1] ?? "";
}

/** Path del padre (`a.b.c` → `a.b`); `null` si es de primer nivel. */
export function parentPath(path: string): string | null {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? null : path.slice(0, idx);
}

/** Une un padre (o `null`) y un nombre en un path lógico. */
export function joinPath(parent: string | null, name: string): string {
  return parent === null || parent === "" ? name : `${parent}.${name}`;
}

/** ¿`descendant` está dentro de (o es igual a) `ancestor`? (por segmentos, no por prefijo de string). */
export function isWithin(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return true;
  return descendant.startsWith(`${ancestor}.`);
}

/** Reescribe un path cuando su prefijo `fromPrefix` cambia a `toPrefix` (rename/move). */
export function rewritePrefix(path: string, fromPrefix: string, toPrefix: string): string {
  if (path === fromPrefix) return toPrefix;
  if (path.startsWith(`${fromPrefix}.`)) return `${toPrefix}${path.slice(fromPrefix.length)}`;
  return path;
}
