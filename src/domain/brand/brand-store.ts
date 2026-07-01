export const BRAND_ROOT = "design-system/brand";
export const BRAND_FILES = {
  brandProfile: "brand.json",
  voice: "voice-and-tone.json",
  visualLanguage: "visual-language.json",
  usageGuidelines: "usage-guidelines.json",
} as const;

export type BrandDocumentKey = keyof typeof BRAND_FILES;

export interface BrandDocumentSnapshot {
  readonly relativePath: string;
  readonly state: "absent" | "parsed" | "unreadable";
  readonly value: unknown | null;
  readonly contentHash: string | null;
  readonly byteLength: number | null;
}

export interface BrandSourceSnapshot {
  readonly root: string;
  readonly status: "absent" | "partial" | "present";
  readonly documents: Readonly<Record<BrandDocumentKey, BrandDocumentSnapshot>>;
}
