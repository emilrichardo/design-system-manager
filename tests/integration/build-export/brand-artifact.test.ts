import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../../src/application/build-export/build-design-system.js";
import { readBrandSource } from "../../../src/infrastructure/brand/brand-source-reader.js";
import { buildDeps, countingWriter, PUBLISHED_WRITE, readSnapshot } from "../../application/build-export/build-export-fakes.js";
import { writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("build/export brand artifact (T019)", () => {
  it("incluye brand.json cuando design-system/brand existe", async () => {
    const snapshot = await readSnapshot(projects);
    const project = projects[projects.length - 1]!;
    await writeFileIn(project.dir, "design-system/brand/brand.json", JSON.stringify({ formatVersion: "1.0.0", name: "Acme", shortName: null, description: null, purpose: null, mission: null, vision: null, values: [], positioning: null, audiences: [], personality: null, principles: [], promise: null, differentiators: [], status: "partial" }, null, 2) + "\n");
    await writeFileIn(project.dir, "design-system/brand/voice-and-tone.json", JSON.stringify({ formatVersion: "1.0.0", voicePrinciples: [], toneDimensions: [], terminology: { preferred: [], forbidden: [] }, microcopyGuidance: null, errorMessageGuidance: null, ctaGuidance: null }, null, 2) + "\n");
    await writeFileIn(project.dir, "design-system/brand/visual-language.json", JSON.stringify({ formatVersion: "1.0.0", logoVariants: [], clearSpace: null, minimumSize: null, backgroundCompatibility: [], incorrectUsage: [], brandColors: [], supportingColors: [], typographicRoles: [], iconStyle: null, illustrationStyle: null, photographyStyle: null, imageTreatment: null, compositionGuidance: null, shapeLanguage: null, borderLanguage: null, shadowLanguage: null, motionLanguage: null }, null, 2) + "\n");
    await writeFileIn(project.dir, "design-system/brand/usage-guidelines.json", "[]\n");
    const writer = countingWriter(PUBLISHED_WRITE);

    const result = await buildDesignSystem({ executionDir: project.dir }, buildDeps(snapshot, { writer, readBrandSource: () => readBrandSource(project.dir) }));

    expect(result.outcome).toBe("built");
    expect(result.brandArtifact).toMatchObject({ status: "generated", relativePath: "brand.json" });
    expect(writer.lastRequest?.extraFiles).toHaveLength(1);
    expect(writer.lastRequest?.extraFiles[0]?.relativePath).toBe("brand.json");
    const manifest = JSON.parse(new TextDecoder().decode(writer.lastRequest!.manifest.bytes)) as { brand: { status: string; relativePath: string | null } };
    expect(manifest.brand).toMatchObject({ status: "generated", relativePath: "brand.json" });
  });

  it("omite brand.json sin error cuando design-system/brand está ausente", async () => {
    const snapshot = await readSnapshot(projects);
    const writer = countingWriter(PUBLISHED_WRITE);

    const result = await buildDesignSystem({ executionDir: "/x" }, buildDeps(snapshot, { writer }));

    expect(result.outcome).toBe("built");
    expect(result.brandArtifact).toEqual({ status: "absent", relativePath: null, contentHash: null, byteLength: null });
    expect(writer.lastRequest?.extraFiles).toEqual([]);
  });
});
