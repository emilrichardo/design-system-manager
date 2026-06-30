// T096 (006) — All-or-nothing: si un renderer no puede representar un token, el build retorna
// `unsupported-value`, NO construye manifest, NO invoca writer y no expone artifacts parciales. Cubre
// CSS no soportado, nombre CSS inválido, colisión CSS y (vía renderer inyectado) fallo JSON/TS.
import { afterEach, describe, expect, it } from "vitest";
import { buildDesignSystem } from "../../../src/application/build-export/build-design-system.js";
import type { ArtifactRenderResult } from "../../../src/application/build-export/build-ports.js";
import type { ManifestBuilderInput, ManifestBuilderResult } from "../../../src/application/build-export/manifest-builder.js";
import { COLOR } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import {
  buildBuildManifest,
  buildDeps,
  countingRenderer,
  countingWriter,
  readSnapshot,
  PUBLISHED_WRITE,
} from "../../application/build-export/build-export-fakes.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

function colorTok() {
  return { $type: "color", $value: COLOR };
}

async function expectBlocked(tokens: Record<string, unknown>, renderersOverride?: () => ReturnType<typeof countingRenderer>[]) {
  const snapshot = await readSnapshot(bag, tokens);
  const writer = countingWriter(PUBLISHED_WRITE);
  let manifestCalls = 0;
  const countingManifest = (input: ManifestBuilderInput): ManifestBuilderResult => {
    manifestCalls += 1;
    return buildBuildManifest(input);
  };
  const renderers = renderersOverride ? renderersOverride() : [countingRenderer("css"), countingRenderer("json"), countingRenderer("typescript")];
  const result = await buildDesignSystem({ executionDir: "x" }, buildDeps(snapshot, { renderers, writer, buildManifest: countingManifest }));
  expect(result.outcome).toBe("unsupported-value");
  expect(result.wrote).toBe(false);
  expect(result.artifacts).toEqual([]);
  expect(writer.calls).toBe(0);
  expect(manifestCalls).toBe(0);
  return result;
}

describe("build blocks partial (T096)", () => {
  it("CSS no soportado (strokeStyle composite) → unsupported-value, sin manifest ni writer", async () => {
    await expectBlocked({ color: { ok: colorTok() }, stroke: { x: { $type: "strokeStyle", $value: "solid" } } });
  });

  it("nombre CSS inválido (segmento con espacio) → unsupported-value", async () => {
    await expectBlocked({ color: { "bad name": colorTok() } });
  });

  it("colisión de nombres CSS (foo.bar-baz vs foo-bar.baz) → unsupported-value", async () => {
    await expectBlocked({ foo: { "bar-baz": colorTok() }, "foo-bar": { baz: colorTok() } });
  });

  it("fallo de JSON renderer → unsupported-value, writer 0 (CSS ya en memoria, no se publica)", async () => {
    const fail = (): ArtifactRenderResult => ({ outcome: "unsupported-value", errors: [{ format: "json", code: "resolved-token-value-invalid", tokenPath: "x.y", type: null, message: "no" }] });
    await expectBlocked({ color: { ok: colorTok() } }, () => [countingRenderer("css"), countingRenderer("json", fail), countingRenderer("typescript")]);
  });

  it("fallo de TypeScript renderer → unsupported-value, writer 0", async () => {
    const fail = (): ArtifactRenderResult => ({ outcome: "unsupported-value", errors: [{ format: "typescript", code: "typescript-literal-invalid", tokenPath: "x.y", type: null, message: "no" }] });
    await expectBlocked({ color: { ok: colorTok() } }, () => [countingRenderer("css"), countingRenderer("json"), countingRenderer("typescript", fail)]);
  });
});
