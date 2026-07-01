// T003 (011) — Utilidades puras compartidas por los validadores de tipo DTCG profundo. Sin I/O.
// Espejan (no reimplementan por duplicado azaroso) las mismas reglas de forma que
// `src/infrastructure/build-export/css-renderer.ts` ya usa para 7 de los 12 tipos; la conexión real de
// `validate`/`inspect` a estos módulos ocurre en `011` checkpoint C (T012), no aquí.
import type { Issue } from "../../issue.js";

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isAliasReference(value: unknown): value is string {
  return typeof value === "string" && /^\{[^{}]+\}$/.test(value);
}

/** Objeto de color sRGB concreto (mismo shape mínimo que `dtcg.schema.ts`/`css-renderer.ts`). Uso interno de tipos compuestos (shadow/border). */
export function isConcreteSrgbColor(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.colorSpace !== "srgb") return false;
  if (typeof obj.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(obj.hex)) return false;
  if (!Array.isArray(obj.components) || obj.components.length !== 3) return false;
  if (!obj.components.every((c) => isFiniteNumber(c) && c >= 0 && c <= 1)) return false;
  if (obj.alpha !== undefined && !(isFiniteNumber(obj.alpha) && obj.alpha >= 0 && obj.alpha <= 1)) return false;
  return true;
}

export function issueAt(code: string, path: string, message: string): Issue {
  return { code, message, path };
}
