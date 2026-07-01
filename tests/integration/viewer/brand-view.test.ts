import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emptyBrandProfile, emptyBrandVisualLanguage, emptyBrandVoice } from "../../../src/domain/brand/index.js";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => handle.close()));
  await Promise.all(hosts.splice(0).map((host) => host.cleanup()));
});

async function writeBrandFixture(rootDir: string): Promise<void> {
  await mkdir(join(rootDir, "design-system", "brand"), { recursive: true });
  await writeFile(
    join(rootDir, "design-system", "brand", "brand.json"),
    `${JSON.stringify(
      {
        ...emptyBrandProfile(),
        status: "partial",
        name: "Acme",
        purpose: "Build calm infrastructure",
        values: ["clarity", "care"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    join(rootDir, "design-system", "brand", "voice-and-tone.json"),
    `${JSON.stringify(
      {
        ...emptyBrandVoice(),
        voicePrinciples: ["plain words"],
        toneDimensions: [{ axis: "formal-informal", position: "balanced", examples: { do: ["Explain clearly"], dont: ["Overwhelm users"] } }],
        terminology: { preferred: ["design system"], forbidden: ["theme thing"] },
        microcopyGuidance: "Prefer direct phrasing.",
        errorMessageGuidance: "Explain what happened and what to do next.",
        ctaGuidance: "Lead with a clear verb.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    join(rootDir, "design-system", "brand", "visual-language.json"),
    `${JSON.stringify(
      {
        ...emptyBrandVisualLanguage(),
        logoVariants: [
          { logicalPath: "logos/primary.svg", variantRole: "primary", required: true, resolution: "resolved" },
          { logicalPath: null, variantRole: "monochrome", required: true, resolution: "placeholder" },
        ],
        backgroundCompatibility: [{ id: "bg-1", kind: "do", description: "Use sufficient contrast", relatedAsset: null }],
        incorrectUsage: [{ id: "dont-1", kind: "dont", description: "Do not stretch the logo", relatedAsset: null }],
        brandColors: ["color.brand.primary"],
        supportingColors: ["color.base.blue-500"],
        typographicRoles: [{ role: "heading", tokenPath: "typography.heading.family" }],
        iconStyle: "geometric",
        shapeLanguage: "soft corners",
        motionLanguage: "quick and subtle",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

describe("brand view section (T026)", () => {
  it("GET /api/section/brand expone status, groups de assets y standards sin rutas absolutas", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    await writeBrandFixture(host.dir);
    const handle = await startViewerHttpServer({ deps: realViewerDeps(host.dir, newCallCounts()), executionDir: host.dir, host: "127.0.0.1" });
    handles.push(handle);

    const res = await fetch(`http://127.0.0.1:${handle.port}/api/section/brand`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      readonly formatVersion: string;
      readonly section: string;
      readonly state: string;
      readonly data: {
        readonly status: string;
        readonly profile: { readonly name: string; readonly values: readonly string[] } | null;
        readonly assetGroups: readonly { readonly kind: string; readonly references: readonly { readonly logicalPath: string | null; readonly resolution: string }[]; readonly missing: readonly unknown[] }[];
        readonly quality: { readonly missingAssets: readonly { readonly variantRole: string }[] };
        readonly standards: readonly { readonly id: string }[];
      };
    };
    expect(body).toMatchObject({ formatVersion: "1.0.0", section: "brand", state: "ready" });
    expect(body.data.status).toBe("partial");
    expect(body.data.profile?.name).toBe("Acme");
    expect(body.data.profile?.values).toEqual(["clarity", "care"]);
    expect(body.data.assetGroups).toHaveLength(1);
    expect(body.data.assetGroups[0]?.kind).toBe("logos");
    expect(body.data.assetGroups[0]?.references).toHaveLength(2);
    expect(body.data.assetGroups[0]?.missing).toHaveLength(2);
    expect(body.data.quality.missingAssets.map((missing) => missing.variantRole)).toEqual(["primary", "monochrome"]);
    expect(body.data.standards.map((standard) => standard.id)).toEqual(
      expect.arrayContaining(["DTCG", "WCAG", "WAI-ARIA APG", "Open UI", "UI Specification Schema"]),
    );
    expect(JSON.stringify(body)).not.toMatch(/\/(Users|home|Volumes)\//);
  });
});
