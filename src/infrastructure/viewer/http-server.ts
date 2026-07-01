// T021 (009) — Servidor `node:http` PURO (sin Express/Fastify/framework): `127.0.0.1`, puerto efímero
// por defecto (`0`), solo `GET`. Rutas: `GET /api/session`, `GET /api/section/:id`, y estáticos de la UI
// compilada (`dist/infrastructure/viewer/ui/*.js`, mismo `tsc` del proyecto — sin bundler ni dependencia
// runtime nueva, ADR-0026). El HTML del shell se genera inline (sin paso de copia de assets). Nunca
// `POST`/`PUT`/`DELETE`; cualquier método no-GET → 405. Una excepción inesperada → 500 con un envelope
// `internal-error` seguro (sin stack), nunca un estado de dominio.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

function writeJson(res: ServerResponse, statusCode: number, envelope: ViewerJsonEnvelopeV1<unknown>): void {
  const body = `${JSON.stringify(envelope, null, 2)}\n`;
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body) });
  res.end(body);
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

  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" }).end();
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
