import type { StructuralState } from "../analysis/structural-state.js";
import type { ApplicationPlan } from "../changes/application-plan.js";
import type { ApplicationSummary } from "../changes/application-summary.js";
import type { PresetMetadata } from "./preset-envelope.js";

export const PRESET_APPLICATION_TARGET_FILE = "design-system/tokens/base.tokens.json";

export type PresetNotFoundResource = "preset" | "design-system";

export type PresetApplicationSummary = ApplicationSummary;

export interface PresetApplicationPlan {
  readonly preset: PresetMetadata;
  readonly targetFile: typeof PRESET_APPLICATION_TARGET_FILE;
  readonly plan: ApplicationPlan;
  readonly hostState: StructuralState | null;
  readonly notFoundResource: PresetNotFoundResource | null;
}
