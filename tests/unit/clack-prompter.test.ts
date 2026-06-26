import { describe, expect, it } from "vitest";
import { ClackPrompter, type ClackApi } from "../../src/infrastructure/prompts/clack-prompter.js";
import type { IdentityPromptInput, InitializationSummary } from "../../src/application/ports.js";

const CANCEL = Symbol("cancel");

/** ClackApi scriptable: respuestas sucesivas para text() y un valor fijo para confirm(). */
function scripted(textAnswers: (string | symbol)[], confirmAnswer: boolean | symbol): ClackApi {
  let i = 0;
  return {
    text: async (opts) => {
      const a = textAnswers[i++];
      // si la respuesta es la sentinela "USE_INITIAL", devolver el initialValue (sugerencia).
      return a === "USE_INITIAL" ? opts.initialValue ?? "" : (a as string | symbol);
    },
    confirm: async () => confirmAnswer,
    isCancel: (v) => v === CANCEL,
  };
}

const input: IdentityPromptInput = { defaultVersion: "0.1.0", suggestSlug: (n) => `${n.toLowerCase()}-slug` };
const summary = {} as InitializationSummary;

describe("ClackPrompter (T041)", () => {
  it("respuestas válidas → answered con los datos", async () => {
    const p = new ClackPrompter(scripted(["Acme", "acme-ui", "una desc", "0.2.0"], true));
    const r = await p.requestIdentity(input);
    expect(r.kind).toBe("answered");
    if (r.kind === "answered") {
      expect(r.value).toEqual({ name: "Acme", slug: "acme-ui", description: "una desc", version: "0.2.0" });
    }
  });

  it("presenta la sugerencia de slug como valor inicial (sin recalcular)", async () => {
    // El segundo prompt (slug) usa initialValue = suggestSlug(name). "USE_INITIAL" lo devuelve.
    const p = new ClackPrompter(scripted(["Acme", "USE_INITIAL", "", "0.1.0"], true));
    const r = await p.requestIdentity(input);
    expect(r.kind === "answered" && r.value.slug).toBe("acme-slug");
  });

  it("descripción vacía se omite", async () => {
    const p = new ClackPrompter(scripted(["Acme", "acme", "   ", "0.1.0"], true));
    const r = await p.requestIdentity(input);
    expect(r.kind === "answered" && r.value.description).toBeUndefined();
  });

  it.each([0, 1, 2, 3])("cancelación en el paso %i de identidad → cancelled", async (step) => {
    const answers: (string | symbol)[] = ["Acme", "acme", "desc", "0.1.0"];
    answers[step] = CANCEL;
    const p = new ClackPrompter(scripted(answers, true));
    const r = await p.requestIdentity(input);
    expect(r.kind).toBe("cancelled");
  });

  it("confirmación positiva → answered true", async () => {
    const p = new ClackPrompter(scripted([], true));
    expect(await p.confirm(summary)).toEqual({ kind: "answered", value: true });
  });

  it("confirmación negativa → answered false", async () => {
    const p = new ClackPrompter(scripted([], false));
    expect(await p.confirm(summary)).toEqual({ kind: "answered", value: false });
  });

  it("cancelación en confirmación → cancelled", async () => {
    const p = new ClackPrompter(scripted([], CANCEL));
    expect(await p.confirm(summary)).toEqual({ kind: "cancelled" });
  });
});
