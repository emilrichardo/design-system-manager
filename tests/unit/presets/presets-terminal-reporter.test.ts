import { describe, expect, it } from "vitest";
import { PresetsTerminalReporter } from "../../../src/infrastructure/reporter/presets-terminal-reporter.js";
import { PRESET_APPLICATION_TARGET_FILE } from "../../../src/domain/presets/preset-application-plan.js";
import { applyResult, conflictChange, invalidPresetValidation, presetEntry, presetInspection, presetPlan } from "./presets-test-fixtures.js";
import type { PresetCatalogEntry } from "../../../src/domain/presets/index.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (text: string) => out.push(text), err: (text: string) => err.push(text) }, out, err };
}

describe("PresetsTerminalReporter", () => {
  it("list escribe una salida humana estable a stdout, sin stderr, ANSI, prompts ni TTY", () => {
    const c = capture();
    const again = capture();
    const presets = [presetEntry(), presetEntry({ id: "neutral-alt" as PresetCatalogEntry["id"], name: "Neutral Alt" })];
    new PresetsTerminalReporter(c.io).listCompleted({ outcome: "success", presets, validation: null });
    new PresetsTerminalReporter(again.io).listCompleted({ outcome: "success", presets, validation: null });

    expect(c.err).toEqual([]);
    expect(c.out).toHaveLength(1);
    expect(c.out[0]).toContain("Presets list: success");
    expect(c.out[0]).toContain("neutral-base (Neutral Base) v1.0.0 [color, spacing]");
    expect(c.out[0]).toContain("neutral-alt (Neutral Alt) v1.0.0 [color, spacing]");
    expect(c.out[0]).not.toMatch(/\u001b\[|prompt|TTY/i);
    expect(c.out[0]).toBe(again.out[0]);
  });

  it("inspect muestra metadata, tokens y validacion sin depender de color obligatorio", () => {
    const c = capture();
    new PresetsTerminalReporter(c.io).inspectCompleted({ outcome: "success", inspection: presetInspection() });

    expect(c.err).toEqual([]);
    expect(c.out.join("")).toContain("Preset inspect: success");
    expect(c.out.join("")).toContain("Tokens: 2");
    expect(c.out.join("")).toContain("spacing.2: spacing semantic dimension alias=spacing.1 description=no");
    expect(c.out.join("")).toContain("Validation: valid");
    expect(c.out.join("")).not.toMatch(/\u001b\[/u);
  });

  it("plan muestra target relativo, summary, cambios y conflictos en stdout", () => {
    const c = capture();
    new PresetsTerminalReporter(c.io).planCompleted({ outcome: "conflict", plan: presetPlan([conflictChange]) });

    const text = c.out.join("");
    expect(c.err).toEqual([]);
    expect(text).toContain(`Target: ${PRESET_APPLICATION_TARGET_FILE}`);
    expect(text).not.toContain("/Volumes/");
    expect(text).toContain("Would write: no");
    expect(text).toContain("conflict token color.base.primary");
    expect(text).toContain("preset-value-differs");
  });

  it("apply resume outcome, wrote, verification, backup relativo y errores esperados en stdout", () => {
    const c = capture();
    new PresetsTerminalReporter(c.io).applyCompleted(
      applyResult({
        outcome: "verification-error",
        wrote: true,
        verification: { checked: true, valid: false, contributedTokensPresent: false, newStructuralErrors: [] },
        backup: { relativePath: "design-system/tokens/base.tokens.json.bak" },
        error: { code: "post-write-invalid", message: "Post-write verification failed." },
      }),
    );

    const text = c.out.join("");
    expect(c.err).toEqual([]);
    expect(text).toContain("Preset apply: verification-error");
    expect(text).toContain("Wrote: yes");
    expect(text).toContain("Backup: design-system/tokens/base.tokens.json.bak");
    expect(text).toContain("Error: post-write-invalid - Post-write verification failed.");
  });

  it("invalid-preset esperado tambien va a stdout", () => {
    const c = capture();
    new PresetsTerminalReporter(c.io).listCompleted({ outcome: "invalid-preset", presets: [], validation: invalidPresetValidation });

    expect(c.err).toEqual([]);
    expect(c.out.join("")).toContain("Presets list: invalid-preset");
    expect(c.out.join("")).toContain("preset-envelope-invalid");
  });
});
