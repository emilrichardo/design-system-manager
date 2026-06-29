// T075 (006) — Terminología inequívoca: build manifest (design-system/build/manifest.json) vs Design
// System host manifest (design-system/design-system.json). Son rutas y propósitos distintos.
import { describe, expect, it } from "vitest";
import {
  BUILD_MANIFEST_FILENAME,
  BUILD_OUTPUT_ROOT,
  BUILD_SOURCE_LOGICAL_PATH,
  validateBuildManifestV1,
} from "../../../src/domain/build-export/build-manifest.js";

const HOST_MANIFEST_PATH = "design-system/design-system.json";

describe("manifest terminology (T075)", () => {
  it("constantes del build manifest distintas del host manifest", () => {
    expect(BUILD_OUTPUT_ROOT).toBe("design-system/build");
    expect(`${BUILD_OUTPUT_ROOT}/${BUILD_MANIFEST_FILENAME}`).toBe("design-system/build/manifest.json");
    expect(`${BUILD_OUTPUT_ROOT}/${BUILD_MANIFEST_FILENAME}`).not.toBe(HOST_MANIFEST_PATH);
  });

  it("el source del build manifest es la fuente de tokens, no el host manifest", () => {
    expect(BUILD_SOURCE_LOGICAL_PATH).toBe("design-system/tokens/base.tokens.json");
    expect(BUILD_SOURCE_LOGICAL_PATH).not.toBe(HOST_MANIFEST_PATH);
  });

  it("el validador de build manifest no acepta la forma del host manifest", () => {
    // El host manifest (init) tiene otra shape: no es un BuildManifestV1.
    const hostManifestLike = { manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens" };
    expect(validateBuildManifestV1(hostManifestLike).ok).toBe(false);
  });
});
