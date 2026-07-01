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

const QUALITY_TOKENS = {
  color: {
    $type: "color",
    base: {
      "blue-500": {
        $value: { colorSpace: "srgb", components: [0.231372549, 0.509803922, 0.964705882], alpha: 1, hex: "#3b82f6" },
      },
    },
    semantic: {
      action: { $value: "{color.base.blue-500}" },
    },
    button: {
      directPrimitiveAlias: {
        $value: "{color.base.blue-500}",
        $extensions: { "ar.neuraz.design-system": { layer: "component", component: "button", part: "container", property: "background" } },
      },
    },
    brand: {
      primary: {
        $value: "{color.base.blue-500}",
        $extensions: { "ar.neuraz.design-system": { layer: "primitive", brandRole: "brand" } },
      },
    },
  },
};

async function writeBrandFixture(rootDir: string): Promise<void> {
  await mkdir(join(rootDir, "design-system", "brand"), { recursive: true });
  await writeFile(
    join(rootDir, "design-system", "brand", "brand.json"),
    `${JSON.stringify({ ...emptyBrandProfile(), status: "complete", name: "Acme", purpose: "Build calm infrastructure" }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(rootDir, "design-system", "brand", "voice-and-tone.json"),
    `${JSON.stringify({ ...emptyBrandVoice(), voicePrinciples: ["plain words"] }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(rootDir, "design-system", "brand", "visual-language.json"),
    `${JSON.stringify(
      {
        ...emptyBrandVisualLanguage(),
        logoVariants: [{ logicalPath: "logos/primary.svg", variantRole: "primary", required: true, resolution: "resolved" }],
        backgroundCompatibility: [],
        incorrectUsage: [],
        brandColors: ["color.brand.primary"],
        supportingColors: [],
        typographicRoles: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

describe("quality view section (T026)", () => {
  it("GET /api/section/quality resume counters y agrupa issues por causa", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    await writeFile(join(host.dir, "design-system", "tokens", "base.tokens.json"), `${JSON.stringify(QUALITY_TOKENS, null, 2)}\n`, "utf8");
    await writeBrandFixture(host.dir);
    const handle = await startViewerHttpServer({ deps: realViewerDeps(host.dir, newCallCounts()), executionDir: host.dir, host: "127.0.0.1" });
    handles.push(handle);

    const res = await fetch(`http://127.0.0.1:${handle.port}/api/section/quality`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      readonly section: string;
      readonly data: {
        readonly counters: {
          readonly brand: { readonly overallStatus: string; readonly missingAssets: readonly unknown[] };
          readonly tokens: { readonly total: number; readonly component: number; readonly brandRole: number; readonly componentBypassesSemantic: number };
          readonly components: { readonly groups: number; readonly componentTokens: number };
          readonly build: { readonly hasBuild: boolean; readonly stale: boolean };
        };
        readonly issueGroups: readonly { readonly code: string; readonly count: number }[];
        readonly standards: readonly { readonly id: string }[];
      };
    };
    expect(body.section).toBe("quality");
    expect(body.data.counters.brand.overallStatus).toBe("needs-user-input");
    expect(body.data.counters.brand.missingAssets).toHaveLength(1);
    expect(body.data.counters.tokens.total).toBeGreaterThanOrEqual(4);
    expect(body.data.counters.tokens.component).toBe(1);
    expect(body.data.counters.tokens.brandRole).toBe(1);
    expect(body.data.counters.tokens.componentBypassesSemantic).toBe(1);
    expect(body.data.counters.components.groups).toBe(1);
    expect(body.data.counters.components.componentTokens).toBe(1);
    expect(body.data.counters.build).toEqual({ hasBuild: false, stale: false });
    expect(body.data.issueGroups).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "component-token-bypasses-semantic", count: 1 })]),
    );
    expect(body.data.standards.map((standard) => standard.id)).toEqual(
      expect.arrayContaining(["DTCG", "WCAG", "WAI-ARIA APG", "Open UI", "JSON Schema"]),
    );
  });
});
