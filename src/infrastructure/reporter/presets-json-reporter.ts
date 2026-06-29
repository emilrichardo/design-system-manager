import type {
  PresetApplicationPlanResult,
  PresetInspectionResult,
  PresetListResult,
} from "../../application/presets/preset-ports.js";
import {
  toPresetApplyJsonEnvelope,
  toPresetInspectJsonEnvelope,
  toPresetListJsonEnvelope,
  toPresetPlanJsonEnvelope,
  toPresetsInternalErrorEnvelope,
} from "../../application/presets/json/index.js";
import type { PresetApplyResult } from "../../domain/presets/index.js";
import type { PresetsJsonCommandV1 } from "../../application/presets/json/dto.js";
import type { OutputWriter } from "./terminal-reporter.js";
import { serializePresetsJsonV1 } from "./presets-json-serializer.js";

export class PresetsJsonReporter {
  constructor(private readonly io: OutputWriter) {}

  listCompleted(result: PresetListResult): void {
    this.io.out(serializePresetsJsonV1(toPresetListJsonEnvelope(result)));
  }

  inspectCompleted(result: PresetInspectionResult): void {
    this.io.out(serializePresetsJsonV1(toPresetInspectJsonEnvelope(result)));
  }

  planCompleted(result: PresetApplicationPlanResult): void {
    this.io.out(serializePresetsJsonV1(toPresetPlanJsonEnvelope(result)));
  }

  applyCompleted(result: PresetApplyResult): void {
    this.io.out(serializePresetsJsonV1(toPresetApplyJsonEnvelope(result)));
  }

  internalError(command: PresetsJsonCommandV1): void {
    this.io.err(serializePresetsJsonV1(toPresetsInternalErrorEnvelope(command)));
  }
}
