// Preparación en memoria de los tres archivos administrados (contenido ya serializado).
// Orden determinista = EXPECTED_FILES (config, manifest, tokens). No escribe nada.
import type { DesignSystemIdentity } from "../../domain/identity/design-system-identity.js";
import type { PreparedFile } from "../../application/ports.js";
import { buildConfig } from "../../domain/builders/build-config.js";
import { buildManifest } from "../../domain/builders/build-manifest.js";
import { buildTokens } from "../../domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { serializeJson } from "./json.js";

export function prepareFiles(identity: DesignSystemIdentity): PreparedFile[] {
  return [
    { relativePath: MANAGED_FILES.config, content: serializeJson(buildConfig()) },
    { relativePath: MANAGED_FILES.manifest, content: serializeJson(buildManifest(identity)) },
    { relativePath: MANAGED_FILES.tokens, content: serializeJson(buildTokens()) },
  ];
}
