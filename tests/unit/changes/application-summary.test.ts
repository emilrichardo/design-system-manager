// T036 (005) — Derivación determinista del resumen: conteos por operación, total, blockingConflicts y
// wouldWrite, siempre coherente con los cambios (sumatoria por operaciones = total).
import { describe, expect, it } from "vitest";
import { applicationSummary } from "../../../src/domain/changes/application-summary.js";
import { tokenChangeSetCounts } from "../../../src/domain/changes/token-change-set.js";
import type { TokenChange } from "../../../src/domain/changes/token-change.js";

let counter = 0;
const ch = (operation: TokenChange["operation"], over: Partial<TokenChange> = {}): TokenChange => ({
  path: `color.t${(counter += 1)}`,
  nodeKind: "token",
  category: "color",
  level: "primitive",
  operation,
  reason: "r",
  blocksWrite: false,
  conflict: null,
  proposedToken: null,
  ...over,
});

const conflictMeta = { code: "x", path: "color.x", severity: "error" as const, message: "m", blocksWrite: true, proposedAction: "a" };

describe("applicationSummary (T036)", () => {
  it("counts each operation and the total", () => {
    const changes = [
      ch("create"),
      ch("create"),
      ch("update"),
      ch("unchanged"),
      ch("conflict", { blocksWrite: true, conflict: conflictMeta }),
      ch("skip"),
    ];
    const s = applicationSummary(changes);
    expect(s).toMatchObject({ create: 2, update: 1, unchanged: 1, conflict: 1, skip: 1, total: 6, blockingConflicts: 1 });
  });

  it("keeps sum of operations equal to total", () => {
    const changes = [ch("create"), ch("skip"), ch("unchanged"), ch("update")];
    const s = applicationSummary(changes);
    expect(s.create + s.update + s.unchanged + s.conflict + s.skip).toBe(s.total);
  });

  it("wouldWrite is true only with create/update and no blocking conflicts", () => {
    expect(applicationSummary([ch("create")]).wouldWrite).toBe(true);
    expect(applicationSummary([ch("update")]).wouldWrite).toBe(true);
    expect(applicationSummary([ch("unchanged")]).wouldWrite).toBe(false);
    expect(applicationSummary([ch("skip")]).wouldWrite).toBe(false);
    expect(applicationSummary([]).wouldWrite).toBe(false);
    expect(
      applicationSummary([ch("create"), ch("conflict", { blocksWrite: true, conflict: conflictMeta })]).wouldWrite,
    ).toBe(false);
  });

  it("is deterministic for the same input", () => {
    const changes = [ch("create"), ch("conflict", { blocksWrite: true, conflict: conflictMeta })];
    expect(applicationSummary(changes)).toEqual(applicationSummary(changes));
  });

  it("tokenChangeSetCounts reports counts by operation and node kind", () => {
    const counts = tokenChangeSetCounts({
      changes: [ch("create", { nodeKind: "group" }), ch("create"), ch("unchanged")],
    });
    expect(counts.byNodeKind).toEqual({ group: 1, token: 2 });
    expect(counts.byOperation.create).toBe(2);
    expect(counts.total).toBe(3);
  });
});
