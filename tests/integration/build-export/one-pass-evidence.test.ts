// T012 (006) — Evidencia one-pass con spies inyectados: una sola lectura semántica, un parse, un
// analyzer (un grafo de aliases + una resolución de tipos), una proyección de foundations. Más casos de
// alias (normal/directo/chain/missing/cycle/to-group) resueltos desde el MISMO análisis.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { projectFoundationMetadata } from "../../../src/application/foundations/metadata-pass.js";
import { projectFoundations } from "../../../src/application/foundations/project-foundations.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("one-pass evidence (T012)", () => {
  it("una sola lectura de tokens, un análisis, una proyección de foundations, un parse por documento", async () => {
    const dir = await makeProject(bag);

    let tokenReads = 0;
    let analyzerCalls = 0;
    let foundationProjections = 0;
    const baseReader = createManagedDocumentReader({ fileSystem: nodeFileSystem });
    const baseAnalyzer = createDtcgAnalyzer();

    const reader = createBuildSnapshotReader({
      documentReader: {
        read: (req) => {
          if (req.document === "tokens") tokenReads += 1;
          return baseReader.read(req);
        },
      },
      dtcgAnalyzer: {
        analyze: (doc) => {
          analyzerCalls += 1;
          return baseAnalyzer.analyze(doc);
        },
      },
      projectMetadata: projectFoundationMetadata,
      projectInspection: (analysis, metadata) => {
        foundationProjections += 1;
        return projectFoundations(analysis, metadata);
      },
    });

    const tokensText = await readFile(join(dir, "design-system/tokens/base.tokens.json"), "utf8");
    const parseSpy = vi.spyOn(JSON, "parse");
    const r = await reader.read({ executionDir: dir });
    const tokenParseCalls = parseSpy.mock.calls.filter((c) => c[0] === tokensText).length;
    parseSpy.mockRestore();

    expect(r.outcome).toBe("ready");
    expect(tokenReads).toBe(1); // una sola lectura semántica del documento de tokens
    expect(analyzerCalls).toBe(1); // un solo analyzer (un grafo de aliases + una resolución de tipos)
    expect(foundationProjections).toBe(1); // una sola proyección de foundations
    expect(tokenParseCalls).toBe(1); // el documento de tokens se parsea exactamente una vez (sin re-parse)
  });

  it("resuelve alias desde el mismo análisis: normal/directo/chain/missing/cycle/to-group", async () => {
    const tokens = {
      color: {
        base: { $type: "color", $value: COLOR },
        direct: { $value: "{color.base}" },
        mid: { $value: "{color.base}" },
        chain: { $value: "{color.mid}" },
        missingRef: { $value: "{color.nope}" },
        grp: { inner: { $type: "color", $value: COLOR } },
        toGroup: { $value: "{color.grp}" },
        cycA: { $value: "{color.cycB}" },
        cycB: { $value: "{color.cycA}" },
      },
    };
    const dir = await makeProject(bag, { tokens });
    const r = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(r.outcome).toBe("ready");
    if (r.outcome !== "ready") return;
    const by = r.snapshot.resolvedTokenView.byPath;

    const base = by.get("color.base")!;
    expect(base.immediateAliasTarget).toBeNull();
    expect(base.aliasChain).toEqual([]);
    expect(base.resolvedValue).toEqual(COLOR);

    const direct = by.get("color.direct")!;
    expect(direct.immediateAliasTarget).toBe("color.base");
    expect(direct.aliasChain).toEqual(["color.base"]);
    expect(direct.resolvedValue).toEqual(COLOR);
    expect(direct.effectiveType).toBe("color");

    const chain = by.get("color.chain")!;
    expect(chain.immediateAliasTarget).toBe("color.mid");
    expect(chain.aliasChain).toEqual(["color.mid", "color.base"]);
    expect(chain.resolvedValue).toEqual(COLOR);

    const missing = by.get("color.missingRef")!;
    expect(missing.aliasState).toBe("missing");
    expect(missing.resolvedValue).toBe("{color.nope}"); // sin fallback fabricado

    const toGroup = by.get("color.toGroup")!;
    expect(toGroup.aliasState).toBe("to-group");

    const cyc = by.get("color.cycA")!;
    expect(cyc.aliasState).toBe("cyclic");
  });
});
