// Guard arquitectónico mínimo (T004 / Constitución V, XV).
// Verifica, sin depender de un sistema de lint pesado:
//   - ausencia de `console.*` en src/domain y src/application;
//   - dominio sin imports de commander, @clack/prompts ni filesystem (node:fs/fs);
//   - aplicación sin imports de commander ni @clack/prompts.
// La regla de formato (Prettier/ESLint completos) se difiere a fases posteriores para no
// añadir dependencias prematuras; este guard cubre exactamente lo exigido por T004.

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const RULES = [
  {
    dir: "src/domain",
    forbidden: [
      { re: /\bconsole\.\w+/, msg: "console.* no permitido en domain" },
      { re: /from\s+["']commander["']/, msg: "domain no debe importar commander" },
      { re: /from\s+["']@clack\/prompts["']/, msg: "domain no debe importar @clack/prompts" },
      { re: /from\s+["'](node:)?fs(\/promises)?["']/, msg: "domain no debe importar filesystem" },
      { re: /from\s+["'](node:)?path["']/, msg: "domain no debe importar node:path" },
      { re: /\bprocess\.exit\s*\(/, msg: "process.exit() no permitido en domain" },
    ],
  },
  {
    dir: "src/application",
    forbidden: [
      { re: /\bconsole\.\w+/, msg: "console.* no permitido en application" },
      { re: /from\s+["']commander["']/, msg: "application no debe importar commander" },
      { re: /from\s+["']@clack\/prompts["']/, msg: "application no debe importar @clack/prompts" },
      { re: /from\s+["'](node:)?fs(\/promises)?["']/, msg: "application no debe importar filesystem" },
      { re: /from\s+["'](node:)?path["']/, msg: "application no debe importar node:path" },
      { re: /from\s+["'][^"']*infrastructure/, msg: "application no debe importar infraestructura concreta" },
      { re: /\bprocess\.exit\s*\(/, msg: "process.exit() no permitido en application" },
    ],
  },
  {
    dir: "src/infrastructure",
    forbidden: [
      { re: /from\s+["']commander["']/, msg: "infrastructure no debe importar commander (solo CLI)" },
      { re: /\bprocess\.exit\s*\(/, msg: "process.exit() no permitido en infrastructure" },
    ],
  },
  // T024 (009) — el Viewer es 100% read-only y framework-agnostic: nada de node:http/DOM/Commander/
  // puertos de escritura dentro de `src/application/viewer/**` (solo `src/infrastructure/viewer/**`
  // puede conocer el servidor/DOM).
  {
    dir: "src/application/viewer",
    forbidden: [
      { re: /from\s+["'](node:)?http["']/, msg: "application/viewer no debe importar node:http (solo infrastructure/viewer)" },
      { re: /\b(document|window)\s*\./, msg: "application/viewer no debe referenciar document/window (DOM)" },
      { re: /from\s+["']commander["']/, msg: "application/viewer no debe importar commander" },
      { re: /\b\w*Writer(Port)?\b/, msg: "application/viewer no debe referenciar un puerto de escritura (*Writer/*WriterPort)" },
    ],
  },
  // T008 (010) — el Editor vive como adapter de aplicación sobre 008: sin filesystem, DOM, servidor HTTP,
  // Commander ni puertos de persistencia dentro de `src/application/editor/**`.
  {
    dir: "src/application/editor",
    forbidden: [
      { re: /from\s+["'](node:)?http["']/, msg: "application/editor no debe importar node:http (solo infrastructure/viewer)" },
      { re: /\b(document|window)\s*\./, msg: "application/editor no debe referenciar document/window (DOM)" },
      { re: /from\s+["']commander["']/, msg: "application/editor no debe importar commander" },
      { re: /\b\w*Writer(Port)?\b/, msg: "application/editor no debe referenciar un puerto de escritura (*Writer/*WriterPort)" },
    ],
  },
];

async function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Devuelve la lista de violaciones encontradas (vacía = OK). */
export async function findViolations(root = ROOT) {
  const violations = [];
  for (const rule of RULES) {
    const base = join(root, rule.dir);
    for (const file of await walk(base)) {
      const text = await readFile(file, "utf8");
      for (const { re, msg } of rule.forbidden) {
        if (re.test(text)) {
          violations.push({ file: relative(root, file), msg });
        }
      }
    }
  }
  return violations;
}

// Ejecución directa: `node scripts/arch-guard.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = await findViolations();
  if (violations.length > 0) {
    for (const v of violations) process.stderr.write(`arch-guard: ${v.file}: ${v.msg}\n`);
    process.exit(1);
  }
  process.stdout.write("arch-guard: OK\n");
}
