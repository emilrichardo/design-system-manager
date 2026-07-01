import { emptyBrandProfile, emptyBrandVisualLanguage, emptyBrandVoice } from "../brand/index.js";
import type { PresetId } from "./preset-id.js";

export interface PresetSupportDocument {
  readonly relativePath: string;
  readonly content: string;
}

function jsonDocument(relativePath: string, value: unknown): PresetSupportDocument {
  return {
    relativePath,
    content: `${JSON.stringify(value, null, 2)}\n`,
  };
}

const WEB_COMPLETE_SUPPORT_DOCUMENTS: readonly PresetSupportDocument[] = Object.freeze([
  jsonDocument("design-system/brand/brand.json", emptyBrandProfile()),
  jsonDocument("design-system/brand/voice-and-tone.json", emptyBrandVoice()),
  jsonDocument("design-system/brand/visual-language.json", emptyBrandVisualLanguage()),
  jsonDocument("design-system/brand/usage-guidelines.json", []),
]);

export function presetSupportDocuments(id: PresetId): readonly PresetSupportDocument[] {
  switch (id) {
    case "web-complete":
      return WEB_COMPLETE_SUPPORT_DOCUMENTS;
    default:
      return [];
  }
}
