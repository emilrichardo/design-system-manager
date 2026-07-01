// T042 (010) — Cobertura de `contracts/editor-accessibility-v1.contract.md`: navegación por teclado,
// foco visible, labels, errores asociados por control, sin drag-and-drop obligatorio, anuncios vía
// live regions para preview/aprobación/conflicto/apply/recovery, reduced motion, contraste, sin
// dependencia exclusiva del color.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function uiSource(): Promise<string> {
  return readFile(new URL("../../../src/infrastructure/viewer/ui/main.ts", import.meta.url), "utf8");
}

async function httpServerSource(): Promise<string> {
  return readFile(new URL("../../../src/infrastructure/viewer/http-server.ts", import.meta.url), "utf8");
}

describe("editor accessibility contract (T042)", () => {
  it("sin acciones pointer-only destructivas: ninguna operación de mover token/grupo depende de drag-and-drop", async () => {
    const source = await uiSource();
    expect(source).not.toContain("dragstart");
    expect(source).not.toContain("ondrop");
    expect(source).not.toContain("draggable");
    // el move usa un input de texto para el destino (parent selector), nunca un target de drop.
    expect(source).toContain("New name, parent or destination path");
  });

  it("labels: cada control creado por labeledInput/labeledSelect tiene <label htmlFor> asociado", async () => {
    const source = await uiSource();
    expect(source).toContain("label.htmlFor = id;");
    for (const id of [
      "editor-token-path",
      "editor-value-type",
      "editor-value-input",
      "editor-value-unit",
      "editor-value-boolean",
      "editor-alias-path",
      "editor-alias-target",
      "editor-admin-path",
      "editor-admin-destination",
    ]) {
      expect(source).toContain(id);
    }
  });

  it("errores asociados por control: aria-describedby + aria-invalid en el input de valor, con role=alert en el mensaje", async () => {
    const source = await uiSource();
    expect(source).toContain('valueError.setAttribute("role", "alert")');
    expect(source).toContain('valueInput.setAttribute("aria-describedby", valueError.id)');
    expect(source).toContain('valueInput.setAttribute("aria-invalid", "true")');
    expect(source).toContain("valueInput.removeAttribute(\"aria-invalid\")");
    // el foco se mueve al control inválido: el error nunca queda anunciado sin que el usuario pueda llegar a él.
    expect(source).toContain("valueInput.focus();");
  });

  it("anuncios vía live region para preview, revisión (aprobación/conflicto) y resultado de apply/recovery", async () => {
    const source = await uiSource();
    // preview mueve el foco al resultado (output.focus()).
    expect(source).toContain("output.focus();");
    // el panel de revisión (diff/conflicts/warnings/approve) es una región viva.
    expect(source).toContain('container.setAttribute("aria-live", "polite")');
    // el estado del plan (incluye aprobación, cancelación, apply, conflict, recovery) es una región viva.
    expect(source).toContain('planStatus.setAttribute("aria-live", "polite")');
    // los mensajes de apply cubren success, conflicto y recovery explícitamente (nunca solo el nombre crudo del estado).
    for (const state of ["applied:", "unchanged:", "conflict:", '"source-changed-concurrently":', '"source-unavailable":', '"write-error":', '"verification-error":', '"recovery-required":']) {
      expect(source).toContain(state);
    }
  });

  it("focus visible, reduced motion y skip-link se preservan del shell de 009 (sin regresión)", async () => {
    const source = await httpServerSource();
    expect(source).toContain(":focus-visible");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("skip-link");
  });

  it("estado de apply nunca depende solo de color: cada estado tiene un mensaje textual explícito", async () => {
    const source = await uiSource();
    expect(source).toMatch(/EDITOR_APPLY_STATE_MESSAGES[\s\S]{0,50}Record<string, string>/);
    // el único uso de color (swatch de 009) siempre acompaña un valor textual (hex/describeValue), nunca es la única señal.
    expect(source).toContain("swatch.style.backgroundColor");
    expect(source).toContain("describeValue(");
  });

  it("navegación por teclado: todas las acciones del editor son <button>/<form> nativos (nunca solo onclick en <div>/<span>)", async () => {
    const source = await uiSource();
    const divClickHandlers = /el\.querySelectorAll\("div"\)[\s\S]{0,30}addEventListener\("click"/;
    expect(source).not.toMatch(divClickHandlers);
    expect(source).toContain('document.createElement("button")');
  });
});
