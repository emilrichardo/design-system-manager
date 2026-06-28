// T018 + T020 (005) — Catálogo de presets empaquetado en el paquete (infraestructura).
// Resolución de assets relativa al MÓDULO compilado vía `import.meta.url`
// (`dist/infrastructure/presets/bundled-preset-catalog.js` → `../../../presets/`), NUNCA `process.cwd()`,
// red, variables de entorno ni rutas provenientes del contenido del preset. La misma profundidad
// (`../../../presets/`) funciona en fuente (`src/infrastructure/presets/…`) y en compilado
// (`dist/infrastructure/presets/…`). Los assets son DATOS inertes: no se ejecuta código.
//
// Valida de forma determinista: forma del catálogo, ids válidos/únicos, `file` relativo y contenido en
// `presets/`, coincidencia id↔envelope, y assets ausentes/corruptos. Devuelve un resultado tipado
// (sin `Error` público, sin paths absolutos). NO realiza validación DTCG/foundations profunda
// (eso es Checkpoint C); solo interpreta el envelope a nivel básico (`createPresetEnvelope`).
import type {
  PresetCatalogEntry,
  PresetEnvelope,
  PresetEnvelopeInput,
} from "../../domain/presets/preset-envelope.js";
import { createPresetEnvelope, toPresetCatalogEntry } from "../../domain/presets/preset-envelope.js";
import type { PresetId } from "../../domain/presets/preset-id.js";
import { isPresetId } from "../../domain/presets/preset-id.js";
import type { PresetCatalogPort } from "../../application/presets/preset-ports.js";
import { readJsonAsset } from "./preset-asset-reader.js";

/** Por qué un catálogo empaquetado no está disponible (estado seguro, sin paths absolutos). */
export type CatalogInvalidReason =
  | "catalog-missing"
  | "catalog-corrupt"
  | "catalog-shape-invalid"
  | "invalid-id"
  | "duplicate-id"
  | "invalid-file"
  | "asset-missing"
  | "asset-corrupt"
  | "envelope-invalid"
  | "id-mismatch";

/** Resultado de cargar el catálogo empaquetado (orden = orden declarado en `catalog.json`). */
export type CatalogLoadResult =
  | {
      readonly ok: true;
      readonly entries: readonly PresetCatalogEntry[];
      readonly envelopes: ReadonlyMap<PresetId, PresetEnvelope>;
    }
  | { readonly ok: false; readonly reason: CatalogInvalidReason; readonly message: string };

export interface BundledCatalogOptions {
  /** Inyección PRIVADA/explícita de la raíz de assets para pruebas (debe terminar en `/`). */
  readonly baseUrl?: URL;
}

/** Raíz de assets empaquetados, resuelta desde este módulo (no depende del cwd). */
export function bundledPresetsBaseUrl(): URL {
  return new URL("../../../presets/", import.meta.url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resuelve `file` SOLO si es un nombre relativo contenido dentro de `base` (un único segmento, sin
 * separadores, sin `..`, sin esquema/protocolo/unidad, sin path absoluto, sin escape de symlink fuera
 * de la raíz). Devuelve `null` si no es seguro.
 */
function resolveContainedAsset(base: URL, file: string): URL | null {
  if (typeof file !== "string" || file.length === 0) return null;
  if (/[\\/]/.test(file)) return null; // sin separadores de ruta
  if (file.includes("..")) return null; // sin traversal
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(file)) return null; // sin esquema/protocolo/unidad
  const url = new URL(file, base);
  if (url.protocol !== "file:") return null;
  if (!url.href.startsWith(base.href)) return null; // contenido dentro de la raíz
  return url;
}

function coerceEnvelopeInput(raw: unknown): PresetEnvelopeInput | null {
  if (!isRecord(raw)) return null;
  const { id, name, description, version, includedCategories, tokens } = raw;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (typeof description !== "string" || typeof version !== "string") return null;
  if (!Array.isArray(includedCategories) || !includedCategories.every((c) => typeof c === "string")) {
    return null;
  }
  return { id, name, description, version, includedCategories, tokens };
}

function invalid(reason: CatalogInvalidReason, message: string): CatalogLoadResult {
  return { ok: false, reason, message };
}

/**
 * Carga y valida el catálogo empaquetado. Determinista, offline, sin ejecución de código. El orden de
 * `entries` es el orden público declarado en `catalog.json` (invariante del contrato).
 */
export async function loadBundledPresetCatalog(
  options: BundledCatalogOptions = {},
): Promise<CatalogLoadResult> {
  const base = options.baseUrl ?? bundledPresetsBaseUrl();

  const catalogRead = await readJsonAsset(new URL("catalog.json", base), "catalog.json");
  if (!catalogRead.ok) {
    return invalid(catalogRead.reason === "corrupt" ? "catalog-corrupt" : "catalog-missing", catalogRead.message);
  }

  const catalog = catalogRead.value;
  if (!isRecord(catalog) || catalog.formatVersion !== "1.0.0" || !Array.isArray(catalog.presets)) {
    return invalid("catalog-shape-invalid", "Preset catalog shape is invalid.");
  }

  const entries: PresetCatalogEntry[] = [];
  const envelopes = new Map<PresetId, PresetEnvelope>();
  const seenIds = new Set<string>();

  for (const item of catalog.presets) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.file !== "string") {
      return invalid("catalog-shape-invalid", "Preset catalog item shape is invalid.");
    }
    const { id, file } = item;
    if (!isPresetId(id)) return invalid("invalid-id", `Preset id is invalid: ${id}.`);
    if (seenIds.has(id)) return invalid("duplicate-id", `Preset id is duplicated: ${id}.`);
    seenIds.add(id);

    const assetUrl = resolveContainedAsset(base, file);
    if (assetUrl === null) return invalid("invalid-file", `Preset file reference is invalid for id: ${id}.`);

    const read = await readJsonAsset(assetUrl, file);
    if (!read.ok) {
      return invalid(read.reason === "corrupt" ? "asset-corrupt" : "asset-missing", read.message);
    }

    const input = coerceEnvelopeInput(read.value);
    if (input === null) return invalid("envelope-invalid", `Preset envelope is not interpretable: ${id}.`);

    const envelope = createPresetEnvelope(input);
    if (!envelope.ok) return invalid("envelope-invalid", `Preset envelope is invalid: ${id}.`);
    if (envelope.value.id !== id) {
      return invalid("id-mismatch", `Preset envelope id does not match catalog id: ${id}.`);
    }

    entries.push(toPresetCatalogEntry(envelope.value));
    envelopes.set(envelope.value.id, envelope.value);
  }

  return { ok: true, entries, envelopes };
}

/**
 * Adaptador de `PresetCatalogPort` sobre el catálogo empaquetado. Un catálogo inválido (defecto de
 * empaquetado) se proyecta como lista vacía / `get` nulo; los casos de uso de Checkpoint C/F usan
 * `loadBundledPresetCatalog` para exponer `invalid-preset` de forma segura. La carga se memoiza.
 */
export function createBundledPresetCatalog(options: BundledCatalogOptions = {}): PresetCatalogPort {
  let cached: Promise<CatalogLoadResult> | null = null;
  const load = (): Promise<CatalogLoadResult> => (cached ??= loadBundledPresetCatalog(options));
  return {
    async list(): Promise<readonly PresetCatalogEntry[]> {
      const result = await load();
      return result.ok ? result.entries : [];
    },
    async get(id: PresetId): Promise<PresetEnvelope | null> {
      const result = await load();
      return result.ok ? (result.envelopes.get(id) ?? null) : null;
    },
  };
}
