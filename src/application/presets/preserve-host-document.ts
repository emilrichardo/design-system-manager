import { FOUNDATION_CATEGORY_IDS } from "../../domain/foundations/foundation-category.js";

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneJsonValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneJsonValue(item)) as T;
  if (isJsonRecord(value)) {
    const cloned: JsonRecord = {};
    for (const [key, child] of Object.entries(value)) cloned[key] = cloneJsonValue(child);
    return cloned as T;
  }
  return value;
}

export function logicalPathSegments(path: string): readonly string[] {
  return path.split(".").filter((segment) => segment.length > 0);
}

export function readLogicalPath(root: JsonRecord, path: string): unknown {
  let current: unknown = root;
  for (const segment of logicalPathSegments(path)) {
    if (!isJsonRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function insertMissingLogicalPath(root: JsonRecord, path: string, fragment: JsonRecord): boolean {
  const segments = logicalPathSegments(path);
  if (segments.length === 0) return false;

  let current = root;
  for (const segment of segments.slice(0, -1)) {
    const child = current[segment];
    if (child === undefined) {
      const next: JsonRecord = {};
      current[segment] = next;
      current = next;
      continue;
    }
    if (!isJsonRecord(child) || "$value" in child) return false;
    current = child;
  }

  const leaf = segments[segments.length - 1] as string;
  if (Object.prototype.hasOwnProperty.call(current, leaf)) return false;
  current[leaf] = cloneJsonValue(fragment);
  reorderKnownCategories(root);
  return true;
}

export function completeMissingDescription(root: JsonRecord, path: string, description: string): boolean {
  const existing = readLogicalPath(root, path);
  if (!isJsonRecord(existing) || !("$value" in existing)) return false;
  if (Object.prototype.hasOwnProperty.call(existing, "$description")) return false;
  existing.$description = description;
  return true;
}

export function serializePresetCandidateValue(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function reorderKnownCategories(root: JsonRecord): void {
  const entries = Object.entries(root);
  const known = entries
    .filter(([key]) => FOUNDATION_CATEGORY_IDS.includes(key as never))
    .sort(([a], [b]) => FOUNDATION_CATEGORY_IDS.indexOf(a as never) - FOUNDATION_CATEGORY_IDS.indexOf(b as never));
  const unknown = entries.filter(([key]) => !FOUNDATION_CATEGORY_IDS.includes(key as never));

  for (const key of Object.keys(root)) delete root[key];
  for (const [key, value] of [...known, ...unknown]) root[key] = value;
}
