// T041 — Adapter del puerto Prompter mediante @clack/prompts. No implementa slugify, no valida
// SemVer, no corrige el slug manual, no escribe ni termina el proceso. La cancelación se propaga
// como PromptOutcome (no como excepción). Las primitivas de Clack se inyectan para poder probar
// la traducción cancel→outcome sin una terminal real.
import { confirm, isCancel, text } from "@clack/prompts";
import type {
  IdentityAnswers,
  IdentityPromptInput,
  InitializationSummary,
  PromptOutcome,
  Prompter,
} from "../../application/ports.js";

export interface ClackApi {
  text(opts: { message: string; initialValue?: string; placeholder?: string }): Promise<string | symbol>;
  confirm(opts: { message: string }): Promise<boolean | symbol>;
  isCancel(value: unknown): boolean;
}

const realClack: ClackApi = {
  text: (opts) => text(opts) as Promise<string | symbol>,
  confirm: (opts) => confirm(opts) as Promise<boolean | symbol>,
  isCancel: (value) => isCancel(value),
};

const CANCELLED = { kind: "cancelled" } as const;

export class ClackPrompter implements Prompter {
  constructor(private readonly clack: ClackApi = realClack) {}

  async requestIdentity(input: IdentityPromptInput): Promise<PromptOutcome<IdentityAnswers>> {
    const name = await this.clack.text({ message: "Nombre del Design System" });
    if (this.clack.isCancel(name)) return CANCELLED;

    const slug = await this.clack.text({
      message: "Slug",
      initialValue: input.suggestSlug(String(name)), // sugerencia del núcleo; no se recalcula
    });
    if (this.clack.isCancel(slug)) return CANCELLED;

    const description = await this.clack.text({ message: "Descripción (opcional)", placeholder: "" });
    if (this.clack.isCancel(description)) return CANCELLED;

    const version = await this.clack.text({ message: "Versión", initialValue: input.defaultVersion });
    if (this.clack.isCancel(version)) return CANCELLED;

    const desc = String(description).trim();
    const answers: IdentityAnswers = {
      name: String(name),
      slug: String(slug),
      version: String(version),
      ...(desc.length > 0 ? { description: desc } : {}),
    };
    return { kind: "answered", value: answers };
  }

  async confirm(_summary: InitializationSummary): Promise<PromptOutcome<boolean>> {
    const answer = await this.clack.confirm({ message: "¿Crear el Design System con este plan?" });
    if (this.clack.isCancel(answer)) return CANCELLED;
    return { kind: "answered", value: answer === true };
  }
}
