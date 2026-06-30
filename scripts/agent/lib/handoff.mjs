// Constructores del handoff (JSON + Markdown) a partir de un resultado de verify. Sin secretos, sin
// archivos fuente completos, sin variables de entorno ni stack traces.
export function buildHandoff(result, generatedAt) {
  const s = result.status;
  const failedKeys = result.gateResults.filter((g) => !g.passed).map((g) => g.key);
  const passedKeys = result.gateResults.filter((g) => g.passed).map((g) => g.key);
  const next = result.passed
    ? `npm run agent:finalize -- --feature ${s.feature} --checkpoint ${result.checkpoint} --message "<mensaje>" --commit`
    : `corregir fallos y re-ejecutar: npm run agent:verify -- --feature ${s.feature}`;
  return {
    feature: s.feature,
    checkpoint: result.checkpoint,
    range: result.range,
    head: s.head,
    lastValidCommit: s.head,
    completedTasks: `${s.completedTasks}/${s.totalTasks}`,
    firstPendingTask: s.firstPendingTask,
    modifiedFiles: s.git.modified,
    stagedFiles: s.git.staged,
    untrackedFiles: s.git.untracked,
    testsExecuted: result.gatesRun,
    testsPassed: passedKeys,
    testsFailed: failedKeys,
    failedCommands: failedKeys.map((k) => `npm/${k}`),
    scopeDrift: result.scopeDrift,
    nextRecommendedCommand: next,
    generatedAt,
  };
}

export function handoffMarkdown(h) {
  const list = (arr) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : "- (ninguno)");
  return [
    `# Handoff — ${h.feature} / Checkpoint ${h.checkpoint} (${h.range})`,
    "",
    `Generado: ${h.generatedAt}`,
    `HEAD / último commit válido: ${h.head}`,
    `Tareas: ${h.completedTasks} — Primera pendiente: ${h.firstPendingTask ?? "(ninguna)"}`,
    "",
    "## Git",
    "### Modificados",
    list(h.modifiedFiles),
    "### Staged",
    list(h.stagedFiles),
    "### Untracked",
    list(h.untrackedFiles),
    "",
    "## Gates",
    `Ejecutados: ${h.testsExecuted.join(", ") || "(ninguno)"}`,
    `Pasaron: ${h.testsPassed.join(", ") || "(ninguno)"}`,
    `Fallaron: ${h.testsFailed.join(", ") || "(ninguno)"}`,
    "",
    "## Deriva de alcance",
    list(h.scopeDrift),
    "",
    "## Siguiente comando recomendado",
    "```bash",
    h.nextRecommendedCommand,
    "```",
    "",
  ].join("\n");
}
