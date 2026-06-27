// Utilidades compartidas por los tests de mappers JSON v1 (no es un archivo de test).

/** Congela recursivamente un objeto/array para detectar mutaciones accidentales. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

/** Devuelve las rutas con valor `undefined` en cualquier nivel (vacío = JSON-safe respecto a undefined). */
export function undefinedPaths(value: unknown, path = "$"): string[] {
  if (value === undefined) return [path];
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => undefinedPaths(v, `${path}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    undefinedPaths(v, `${path}.${k}`),
  );
}
