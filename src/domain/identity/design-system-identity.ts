// T012 — Identidad del Design System: agrega nombre, slug (derivado o manual), versión.
import type { Result } from "../errors.js";
import { ok } from "../errors.js";
import type { Name } from "./name.js";
import { createName } from "./name.js";
import type { Slug } from "./slug.js";
import { createSlug } from "./slug.js";
import { deriveSlug } from "./slugify.js";
import type { Version } from "./version.js";
import { DEFAULT_VERSION, validateVersion } from "./version.js";

export interface DesignSystemIdentity {
  readonly name: Name;
  readonly slug: Slug;
  readonly description?: string;
  readonly version: Version;
}

export interface IdentityInput {
  readonly name: string;
  /** Si se omite, se deriva del nombre. Si se provee, se valida sin corregir en silencio. */
  readonly slug?: string;
  readonly description?: string;
  /** Por defecto `0.1.0`. */
  readonly version?: string;
}

/** Construye una identidad válida o devuelve el primer error de dominio encontrado. */
export function createIdentity(input: IdentityInput): Result<DesignSystemIdentity> {
  const name = createName(input.name);
  if (!name.ok) return name;

  const slug = input.slug === undefined ? deriveSlug(input.name) : createSlug(input.slug);
  if (!slug.ok) return slug;

  const version = validateVersion(input.version ?? DEFAULT_VERSION);
  if (!version.ok) return version;

  const base = { name: name.value, slug: slug.value, version: version.value };
  const identity: DesignSystemIdentity =
    input.description === undefined ? base : { ...base, description: input.description };

  return ok(identity);
}
