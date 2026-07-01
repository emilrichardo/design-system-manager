import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBrandEditorDependencies } from "../../../src/cli/composition.js";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../viewer/real-deps.js";

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => handle.close()));
  await Promise.all(hosts.splice(0).map((host) => host.cleanup()));
});

describe("brand editor extension (T026)", () => {
  it("declara labels, live regions y acciones explícitas para el Brand Editor sin depender solo del color", async () => {
    const source = await readFile(new URL("../../../src/infrastructure/viewer/ui/main.ts", import.meta.url), "utf8");
    for (const label of [
      "Brand editor",
      "Name",
      "Purpose",
      "Mission",
      "Vision",
      "Positioning",
      "Values (one per line)",
      "Differentiators (one per line)",
      "Voice principles (one per line)",
      "Error-message guidance",
      "CTA guidance",
      "Icon style",
      "Shape language",
      "Motion language",
      "Brand color token paths (one per line)",
      "Generate brand plan",
      "Approve brand changes",
      "Cancel brand plan",
    ]) {
      expect(source).toContain(label);
    }
    expect(source).toContain('status.id = "brand-editor-status"');
    expect(source).toContain('status.setAttribute("aria-live", "polite")');
    expect(source).toContain('container.setAttribute("aria-live", "polite")');
    expect(source).toContain("Brand apply:");
    expect(source).not.toContain("dragstart");
  });

  it("plan/apply de brand funcionan por HTTP y escriben design-system/brand/** sin tocar tokens", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    const beforeTokens = await readFile(join(host.dir, "design-system", "tokens", "base.tokens.json"), "utf8");
    const brandDeps = createBrandEditorDependencies(host.dir);
    const handle = await startViewerHttpServer({
      deps: realViewerDeps(host.dir, newCallCounts()),
      executionDir: host.dir,
      host: "127.0.0.1",
      editorBrandApplyDeps: brandDeps.apply,
    });
    handles.push(handle);

    const command = {
      brandProfile: {
        formatVersion: "1.0.0",
        status: "partial",
        name: "Acme",
        purpose: "Build calm infrastructure",
        values: ["clarity", "care"],
      },
      voice: {
        formatVersion: "1.0.0",
        voicePrinciples: ["plain words"],
        errorMessageGuidance: "Say what happened and what to do next.",
      },
      visualLanguage: {
        formatVersion: "1.0.0",
        brandColors: ["color.brand.primary"],
        iconStyle: "geometric",
      },
    };

    const planRes = await fetch(`http://127.0.0.1:${handle.port}/api/editor/brand/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    expect(planRes.status).toBe(200);
    const planBody = (await planRes.json()) as {
      readonly action: string;
      readonly state: string;
      readonly data: { readonly outcome: string; readonly plan: { readonly writable: boolean; readonly files: readonly { readonly relativePath: string; readonly status: string }[] } };
    };
    expect(planBody).toMatchObject({ action: "editor-brand-plan", state: "approval-required" });
    expect(planBody.data.outcome).toBe("planned");
    expect(planBody.data.plan.writable).toBe(true);
    expect(planBody.data.plan.files.map((file) => file.relativePath)).toEqual([
      "design-system/brand/brand.json",
      "design-system/brand/voice-and-tone.json",
      "design-system/brand/visual-language.json",
      "design-system/brand/usage-guidelines.json",
    ]);

    const applyRes = await fetch(`http://127.0.0.1:${handle.port}/api/editor/brand/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(command),
    });
    expect(applyRes.status).toBe(200);
    const applyBody = (await applyRes.json()) as {
      readonly action: string;
      readonly state: string;
      readonly data: { readonly apply: { readonly outcome: string; readonly wrote: boolean }; readonly refresh: { readonly state: string } };
    };
    expect(applyBody).toMatchObject({ action: "editor-brand-apply", state: "applied" });
    expect(applyBody.data.apply).toMatchObject({ outcome: "applied", wrote: true });
    expect(applyBody.data.refresh.state).toBe("reloaded");

    const profileText = await readFile(join(host.dir, "design-system", "brand", "brand.json"), "utf8");
    expect(JSON.parse(profileText)).toMatchObject({ name: "Acme", purpose: "Build calm infrastructure" });
    const afterTokens = await readFile(join(host.dir, "design-system", "tokens", "base.tokens.json"), "utf8");
    expect(afterTokens).toBe(beforeTokens);
  });
});
