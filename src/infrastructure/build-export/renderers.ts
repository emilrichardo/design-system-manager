// T140/T142 (006) — Adaptadores de renderer reales al puerto `ArtifactRenderer`. Envuelve los renderers
// puros (CSS/JSON/TypeScript) normalizando su error a `ArtifactRenderError` (con `type` siempre presente).
// Infraestructura: sin Commander, sin process; solo compone renderers existentes.
import { BUILD_FORMATS, type BuildFormat } from "../../domain/build-export/build-format.js";
import type { ArtifactRenderResult, ArtifactRenderer } from "../../application/build-export/build-ports.js";
import type { NormalizedTokenSet } from "../../domain/build-export/normalized-token.js";
import { renderCssArtifact } from "./css-renderer.js";
import { renderResolvedTokensArtifact } from "./json-renderer.js";
import { renderTypeScriptTokensArtifact } from "./ts-renderer.js";

type RawRenderResult =
  | { readonly outcome: "rendered"; readonly artifact: import("../../domain/build-export/artifact.js").BuildArtifact }
  | { readonly outcome: "unsupported-value"; readonly errors: readonly { format: BuildFormat; code: string; tokenPath: string | null; message: string; type?: string | null }[] };

function normalize(result: RawRenderResult): ArtifactRenderResult {
  if (result.outcome === "rendered") return { outcome: "rendered", artifact: result.artifact };
  return {
    outcome: "unsupported-value",
    errors: result.errors.map((e) => ({ format: e.format, code: e.code, tokenPath: e.tokenPath, type: e.type ?? null, message: e.message })),
  };
}

const RENDER: Record<BuildFormat, (set: NormalizedTokenSet) => ArtifactRenderResult> = {
  css: (set) => normalize(renderCssArtifact(set)),
  json: (set) => normalize(renderResolvedTokensArtifact(set)),
  typescript: (set) => normalize(renderTypeScriptTokensArtifact(set)),
};

/** Renderer único por formato. */
export function rendererFor(format: BuildFormat): ArtifactRenderer {
  return { format, render: (set) => RENDER[format](set) };
}

/** Los tres renderers en orden canónico css/json/typescript. */
export function createArtifactRenderers(): readonly ArtifactRenderer[] {
  return BUILD_FORMATS.map((f) => rendererFor(f));
}
