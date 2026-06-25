// T026 — Builder determinista del manifiesto (design-system/design-system.json).
// Puro. Sin valores visuales (colores/tipografía/spacing) ni configuración del gestor.
import type { DesignSystemIdentity } from "../identity/design-system-identity.js";
import { TOKENS_DIR } from "../plan/managed-files.js";

export const MANIFEST_SCHEMA_VERSION = "0.1.0";

export interface DesignSystemManifest {
  readonly manifestSchemaVersion: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly version: string;
  readonly tokensDir: string;
}

export function buildManifest(identity: DesignSystemIdentity): DesignSystemManifest {
  const base = {
    manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
    name: identity.name.value,
    slug: identity.slug.value,
    version: identity.version.value,
    tokensDir: TOKENS_DIR,
  };
  return identity.description === undefined ? base : { ...base, description: identity.description };
}
