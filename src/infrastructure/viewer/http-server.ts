// T021 (009) / T012 (010) — Servidor `node:http` PURO (sin Express/Fastify/framework): `127.0.0.1`,
// puerto efímero por defecto (`0`). El Viewer conserva GET/HEAD read-only; el Editor agrega rutas
// loopback POST solo para plan/refresh, sin apply ni escrituras productivas.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOKEN_MUTATION_FORMAT_VERSION, type TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { isTokenMutationOperationKind, type TokenMutationOperationV1 } from "../../domain/token-mutations/operation.js";
import { applyEditorCommand, type ApplyEditorCommandDependencies } from "../../application/editor/apply-editor-command.js";
import { composeEditorSessionFromViewer } from "../../application/editor/editor-session.js";
import {
  toEditorApplyJsonEnvelope,
  toEditorInternalErrorJsonEnvelope,
  toEditorInvalidRequestJsonEnvelope,
  toEditorRefreshJsonEnvelope,
  toEditorReviewJsonEnvelope,
  toEditorSessionJsonEnvelope,
} from "../../application/editor/json/map-editor.js";
import { planEditorCommand } from "../../application/editor/plan-editor-command.js";
import type { BrandMutationCommand, BrandMutationPlannedDocuments } from "../../application/brand/plan-brand-mutation.js";
import type { ApplyBrandMutationDependencies, ApplyBrandMutationResult } from "../../application/brand/apply-brand-mutation.js";
import { planBrandMutation } from "../../application/brand/plan-brand-mutation.js";
import { applyBrandMutation } from "../../application/brand/apply-brand-mutation.js";
import type { PlanTokenMutationDependencies } from "../../application/token-mutations/plan-token-mutation.js";
import { buildViewerSession } from "../../application/viewer/build-session.js";
import { buildViewerSectionDetail } from "../../application/viewer/build-section-detail.js";
import type { ViewerSessionDependencies } from "../../application/viewer/ports.js";
import { VIEWER_SECTION_ORDER, isViewerSectionId } from "../../application/viewer/navigation.js";
import {
  toViewerInternalErrorJsonEnvelope,
  toViewerSectionDetailJsonEnvelope,
  toViewerSessionJsonEnvelope,
} from "../../application/viewer/json/map-viewer.js";
import type { ViewerJsonEnvelopeV1 } from "../../application/viewer/json/dto.js";

const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), "ui");

function writeJson(res: ServerResponse, statusCode: number, envelope: ViewerJsonEnvelopeV1<unknown> | unknown): void {
  const body = `${JSON.stringify(envelope, null, 2)}\n`;
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage, maxBytes = 128 * 1024): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes) throw new Error("body-too-large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function isTokenMutationOperation(value: unknown): value is TokenMutationOperationV1 {
  if (typeof value !== "object" || value === null) return false;
  const op = value as { readonly kind?: unknown };
  return isTokenMutationOperationKind(op.kind);
}

function isTokenMutationCommand(value: unknown): value is TokenMutationCommandV1 {
  if (typeof value !== "object" || value === null) return false;
  const command = value as { readonly formatVersion?: unknown; readonly operations?: unknown };
  return command.formatVersion === TOKEN_MUTATION_FORMAT_VERSION && Array.isArray(command.operations) && command.operations.every(isTokenMutationOperation);
}

/** T025 (011) — Valida la forma mínima de un `BrandMutationCommand`. No valida el contenido interno
 * de cada documento (eso lo hace `planBrandMutation` vía el dominio). Acepta comandos vacíos (se
 * resuelven a `outcome: "unchanged"` en el planner, igual que `008`). */
function isBrandMutationCommand(value: unknown): value is BrandMutationCommand {
  if (typeof value !== "object" || value === null) return false;
  const command = value as { readonly brandProfile?: unknown; readonly voice?: unknown; readonly visualLanguage?: unknown; readonly usageGuidelines?: unknown };
  if ("brandProfile" in command && command.brandProfile !== undefined) {
    if (typeof command.brandProfile !== "object" || command.brandProfile === null) return false;
  }
  if ("voice" in command && command.voice !== undefined) {
    if (typeof command.voice !== "object" || command.voice === null) return false;
  }
  if ("visualLanguage" in command && command.visualLanguage !== undefined) {
    if (typeof command.visualLanguage !== "object" || command.visualLanguage === null) return false;
  }
  if ("usageGuidelines" in command && command.usageGuidelines !== undefined) {
    if (!Array.isArray(command.usageGuidelines)) return false;
  }
  return true;
}

interface BrandEditorPlanJsonData {
  readonly plan: ReturnType<typeof planBrandMutation>["plan"];
  readonly outcome: ReturnType<typeof planBrandMutation>["outcome"];
  readonly documents: BrandMutationPlannedDocuments;
}

interface BrandEditorApplyJsonData {
  readonly apply: ApplyBrandMutationResult;
  readonly refresh: { readonly state: "reloaded" | "failed" };
}

function toBrandPlanJsonEnvelope(data: BrandEditorPlanJsonData): unknown {
  return Object.freeze({
    formatVersion: "1.0.0",
    action: "editor-brand-plan",
    state: data.plan.writable ? "approval-required" : "unchanged",
    data,
    error: null,
  });
}

function toBrandApplyJsonEnvelope(data: BrandEditorApplyJsonData): unknown {
  return Object.freeze({
    formatVersion: "1.0.0",
    action: "editor-brand-apply",
    state: data.apply.outcome,
    data,
    error: data.apply.error,
  });
}

// T045 — CSS de accesibilidad inline (sin CDN/hoja externa, offline-first): foco visible con contraste
// ≥3:1 (`outline` de 3px, color con alto contraste sobre fondo claro/oscuro), skip-link solo visible al
// enfocarse, `prefers-reduced-motion` (ninguna animación se añade nunca, pero se declara la intención
// explícitamente), y ningún estilo que dependa SOLO del color (el estado ya se anuncia como texto).
const SHELL_STYLE = `
  :focus-visible { outline: 3px solid #1a56db; outline-offset: 2px; }
  .skip-link { position: absolute; left: -9999px; top: 0; }
  .skip-link:focus { left: 0; background: #fff; color: #000; padding: 0.5em; z-index: 1; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  .swatch { display: inline-block; width: 1em; height: 1em; border: 1px solid #333; vertical-align: middle; }
`;

function shellHtml(): string {
  const items = VIEWER_SECTION_ORDER.map((id) => `<li><a href="#${id}" data-section="${id}">${id}</a></li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design System Viewer</title>
<style>${SHELL_STYLE}</style>
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<header><h1>Design System Viewer</h1></header>
<nav aria-label="Design System sections"><ul>${items}</ul></nav>
<main id="content" tabindex="-1" aria-live="polite"><p>Loading…</p></main>
<script type="module" src="/ui/main.js"></script>
</body>
</html>
`;
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith("/ui/")) return false;
  const rel = pathname.slice("/ui/".length);
  if (rel.includes("..") || rel.startsWith("/")) {
    res.writeHead(400).end();
    return true;
  }
  try {
    const bytes = await readFile(join(UI_DIR, rel));
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
  return true;
}

export interface ViewerHttpServerOptions {
  readonly deps: ViewerSessionDependencies;
  readonly editorPlanDeps?: PlanTokenMutationDependencies;
  readonly editorApplyDeps?: ApplyEditorCommandDependencies;
  /** T025 (011) — deps del Brand Editor (plan/apply sobre `design-system/brand/**`). Opcional: sin
   * ellas, `/api/editor/brand/*` responden 500 como las rutas de tokens cuando faltan. */
  readonly editorBrandApplyDeps?: ApplyBrandMutationDependencies;
  readonly executionDir: string;
  /** Puerto efímero por defecto (`0`); el SO asigna uno libre. */
  readonly port?: number;
  /** `127.0.0.1` por defecto: nunca escucha en una interfaz de red externa (FR-021, offline-first). */
  readonly host?: string;
}

export interface ViewerHttpServerHandle {
  readonly server: Server;
  readonly port: number;
  close(): Promise<void>;
}

/** Arranca el servidor local del Viewer. Solo `GET`; cero escrituras; nunca abre un navegador. */
export function startViewerHttpServer(options: ViewerHttpServerOptions): Promise<ViewerHttpServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const server = createServer((req, res) => {
    void handleRequest(req, res, options).catch(() => {
      if (!res.headersSent) writeJson(res, 500, toViewerInternalErrorJsonEnvelope("session"));
      else res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(options.port ?? 0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({
        server,
        port,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, options: ViewerHttpServerOptions): Promise<void> {
  const method = req.method ?? "GET";
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

  if (method !== "GET" && method !== "HEAD" && method !== "POST") {
    res.writeHead(405, { allow: "GET, HEAD, POST" }).end();
    return;
  }

  if (method === "POST" && !pathname.startsWith("/api/editor/")) {
    res.writeHead(405, { allow: "GET, HEAD" }).end();
    return;
  }

  if ((method === "GET" || method === "HEAD") && pathname.startsWith("/api/editor/")) {
    if (pathname === "/api/editor/session") {
      const viewer = await buildViewerSession({ executionDir: options.executionDir }, options.deps);
      writeJson(res, 200, toEditorSessionJsonEnvelope(composeEditorSessionFromViewer(viewer)));
      return;
    }
    res.writeHead(405, { allow: "POST" }).end();
    return;
  }

  if (method === "POST") {
    if (pathname === "/api/editor/refresh") {
      const viewer = await buildViewerSession({ executionDir: options.executionDir }, options.deps);
      writeJson(res, 200, toEditorRefreshJsonEnvelope(composeEditorSessionFromViewer(viewer)));
      return;
    }
    if (pathname === "/api/editor/plan") {
      if (options.editorPlanDeps === undefined) {
        writeJson(res, 500, toEditorInternalErrorJsonEnvelope());
        return;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be valid JSON."));
        return;
      }
      if (!isTokenMutationCommand(body)) {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be a TokenMutationCommandV1."));
        return;
      }
      const result = await planEditorCommand({ executionDir: options.executionDir }, body, options.editorPlanDeps);
      writeJson(res, 200, toEditorReviewJsonEnvelope(result.review));
      return;
    }
    if (pathname === "/api/editor/apply") {
      if (options.editorApplyDeps === undefined) {
        writeJson(res, 500, toEditorInternalErrorJsonEnvelope());
        return;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be valid JSON."));
        return;
      }
      if (!isTokenMutationCommand(body)) {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be a TokenMutationCommandV1."));
        return;
      }
      // T034 — no re-implementa el gate de aprobación aquí: `applyTokenMutation` (008) ya rechaza
      // comandos no-writable/bloqueados internamente y nunca escribe en esos casos.
      const result = await applyEditorCommand({ executionDir: options.executionDir }, body, options.editorApplyDeps);
      writeJson(res, 200, toEditorApplyJsonEnvelope(result));
      return;
    }
    if (pathname === "/api/editor/brand/plan") {
      if (options.editorBrandApplyDeps === undefined) {
        writeJson(res, 500, toEditorInternalErrorJsonEnvelope());
        return;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be valid JSON."));
        return;
      }
      if (!isBrandMutationCommand(body)) {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be a BrandMutationCommand."));
        return;
      }
      const snapshot = await options.editorBrandApplyDeps.readSource.read(options.executionDir);
      const planned = planBrandMutation(snapshot, body);
      writeJson(res, 200, toBrandPlanJsonEnvelope({ plan: planned.plan, outcome: planned.outcome, documents: planned.documents }));
      return;
    }
    if (pathname === "/api/editor/brand/apply") {
      if (options.editorBrandApplyDeps === undefined) {
        writeJson(res, 500, toEditorInternalErrorJsonEnvelope());
        return;
      }
      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be valid JSON."));
        return;
      }
      if (!isBrandMutationCommand(body)) {
        writeJson(res, 400, toEditorInvalidRequestJsonEnvelope("Request body must be a BrandMutationCommand."));
        return;
      }
      const result = await applyBrandMutation({ executionDir: options.executionDir }, body, options.editorBrandApplyDeps);
      let refresh: BrandEditorApplyJsonData["refresh"] = { state: "failed" };
      if (result.outcome === "applied" || result.outcome === "unchanged") {
        try {
          await buildViewerSession({ executionDir: options.executionDir }, options.deps);
          refresh = { state: "reloaded" };
        } catch {
          refresh = { state: "failed" };
        }
      }
      writeJson(res, 200, toBrandApplyJsonEnvelope({ apply: result, refresh }));
      return;
    }
    res.writeHead(404).end();
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    const html = shellHtml();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(method === "HEAD" ? undefined : html);
    return;
  }

  if (await serveStatic(req, res, pathname)) return;

  if (pathname === "/api/session") {
    const session = await buildViewerSession({ executionDir: options.executionDir }, options.deps);
    writeJson(res, 200, toViewerSessionJsonEnvelope(session));
    return;
  }

  const sectionMatch = /^\/api\/section\/([^/]+)$/.exec(pathname);
  if (sectionMatch) {
    const id = sectionMatch[1] as string;
    if (!isViewerSectionId(id)) {
      res.writeHead(404).end();
      return;
    }
    const detail = await buildViewerSectionDetail({ executionDir: options.executionDir }, options.deps, id);
    writeJson(res, 200, toViewerSectionDetailJsonEnvelope(id, detail));
    return;
  }

  res.writeHead(404).end();
}
