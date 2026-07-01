import {
  emptyBrandProfile,
  emptyBrandVisualLanguage,
  emptyBrandVoice,
  BRAND_FILES,
  BRAND_ROOT,
  type BrandProfileV1,
  type BrandDocumentKey,
  type BrandSourceSnapshot,
  type BrandUsageRuleV1,
  type BrandVisualLanguageV1,
  type BrandVoiceV1,
} from "../../domain/brand/index.js";

export interface BrandMutationCommand {
  readonly brandProfile?: BrandProfileV1;
  readonly voice?: BrandVoiceV1;
  readonly visualLanguage?: BrandVisualLanguageV1;
  readonly usageGuidelines?: readonly BrandUsageRuleV1[];
}

export interface BrandMutationFilePlan {
  readonly relativePath: string;
  readonly status: "create" | "update" | "unchanged";
}

export interface BrandMutationPlan {
  readonly files: readonly BrandMutationFilePlan[];
  readonly writable: boolean;
}

export interface BrandMutationPlannedDocuments {
  readonly brandProfile: BrandProfileV1;
  readonly voice: BrandVoiceV1;
  readonly visualLanguage: BrandVisualLanguageV1;
  readonly usageGuidelines: readonly BrandUsageRuleV1[];
}

export interface BrandMutationPlanResult {
  readonly outcome: "planned" | "unchanged";
  readonly plan: BrandMutationPlan;
  readonly documents: BrandMutationPlannedDocuments;
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function currentValue<T>(snapshot: BrandSourceSnapshot, key: BrandDocumentKey, fallback: T): T {
  const current = snapshot.documents[key];
  return current.state === "parsed" ? (current.value as T) : fallback;
}

function documentRelativePath(key: BrandDocumentKey): string {
  return `${BRAND_ROOT}/${BRAND_FILES[key]}`;
}

export function planBrandMutation(
  current: BrandSourceSnapshot,
  command: BrandMutationCommand,
): BrandMutationPlanResult {
  const documents: BrandMutationPlannedDocuments = {
    brandProfile: command.brandProfile ?? currentValue(current, "brandProfile", emptyBrandProfile()),
    voice: command.voice ?? currentValue(current, "voice", emptyBrandVoice()),
    visualLanguage: command.visualLanguage ?? currentValue(current, "visualLanguage", emptyBrandVisualLanguage()),
    usageGuidelines: command.usageGuidelines ?? currentValue(current, "usageGuidelines", [] as readonly BrandUsageRuleV1[]),
  };

  const files: BrandMutationFilePlan[] = (Object.keys(BRAND_FILES) as BrandDocumentKey[]).map((key) => {
    const relativePath = documentRelativePath(key);
    const nextText = serialize(documents[key]);
    const currentText = current.documents[key].state === "parsed" ? serialize(current.documents[key].value) : null;
    if (currentText === null) return { relativePath, status: "create" };
    if (currentText === nextText) return { relativePath, status: "unchanged" };
    return { relativePath, status: "update" };
  });

  const writable = files.some((file) => file.status !== "unchanged");
  return {
    outcome: writable ? "planned" : "unchanged",
    plan: { files: Object.freeze(files), writable },
    documents,
  };
}
