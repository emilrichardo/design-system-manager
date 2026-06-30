// Parser de tareas: IDs, estados, checkpoints, rangos, primera pendiente, duplicados, huecos, orden,
// marcado. No depende de textos en español/inglés para el estado.
import { describe, expect, it } from "vitest";
import { parseTasksText, resolveCheckpoint, formatRange, markTasksInText } from "../../scripts/agent/lib/tasks.mjs";

const BASE = `## Checkpoint A — X
- [X] T001 una
- [x] T002 dos
## Checkpoint B — Y
- [ ] T003 tres
- [ ] T004 cuatro
`;

describe("parseTasksText", () => {
  it("reconoce [ ], [X] y [x] como estados; cuenta totales y completadas", () => {
    const p = parseTasksText(BASE);
    expect(p.totalTasks).toBe(4);
    expect(p.completedTasks).toBe(2);
    expect(p.firstPendingTask).toBe("T003");
  });

  it("acepta IDs de cualquier ancho (T001…T999)", () => {
    const p = parseTasksText("## Checkpoint A — X\n- [ ] T001 a\n- [ ] T999 z\n");
    expect(p.tasks.map((t) => t.id)).toEqual(["T001", "T999"]);
    expect(p.tasks[1].num).toBe(999);
  });

  it("agrupa por checkpoint y calcula rango", () => {
    const p = parseTasksText(BASE);
    expect(p.checkpoints.map((c) => c.label)).toEqual(["A", "B"]);
    const b = p.checkpoints.find((c) => c.label === "B");
    expect(b?.range).toBe("T003–T004");
  });

  it("ignora IDs en tablas de trazabilidad (solo cuenta ítems de checklist)", () => {
    const text = `## Checkpoint A — X\n- [ ] T001 a\n\n| US | Tasks |\n|---|---|\n| US1 | T001, T050 |\n`;
    const p = parseTasksText(text);
    expect(p.totalTasks).toBe(1);
  });

  it("detecta IDs duplicados", () => {
    const p = parseTasksText("## Checkpoint A — X\n- [ ] T001 a\n- [ ] T001 b\n");
    expect(p.duplicates).toContain("T001");
  });

  it("detecta marcado inconsistente (posterior completada con anterior pendiente)", () => {
    const p = parseTasksText("## Checkpoint A — X\n- [ ] T001 a\n- [X] T002 b\n");
    expect(p.inconsistent).toEqual([{ completedId: "T002", pendingBeforeId: "T001" }]);
  });

  it("detecta tareas fuera de orden numérico", () => {
    const p = parseTasksText("## Checkpoint A — X\n- [ ] T005 a\n- [ ] T002 b\n");
    expect(p.outOfOrder).toContain("T002");
  });

  it("formatRange y resolveCheckpoint (inferencia y explícito)", () => {
    expect(formatRange("T003", "T004")).toBe("T003–T004");
    expect(formatRange("T003", "T003")).toBe("T003");
    const p = parseTasksText(BASE);
    expect(resolveCheckpoint(p, undefined).label).toBe("B"); // inferido de la primera pendiente
    expect(resolveCheckpoint(p, "a").label).toBe("A"); // case-insensitive
    expect(() => resolveCheckpoint(p, "Z")).toThrow();
  });

  it("markTasksInText marca solo los IDs dados que estén pendientes", () => {
    const { text, changed } = markTasksInText(BASE, ["T003"]);
    expect(changed).toBe(1);
    expect(text).toContain("- [X] T003 tres");
    expect(text).toContain("- [ ] T004 cuatro");
    // No re-marca ya completadas.
    expect(markTasksInText(BASE, ["T001"]).changed).toBe(0);
  });
});
