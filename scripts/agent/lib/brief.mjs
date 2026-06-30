// Constructor del brief (prompt breve). Referencia las fuentes por path; NO copia spec/plan/contracts.
export function buildBrief(status) {
  const rangeTasks = status.parsed.tasks.filter((t) => status.checkpoint.taskIds.includes(t.id));
  const next = status.parsed.tasks.find((t) => t.num > Number(status.rangeLast?.slice(1) ?? -1));
  const lines = [];
  lines.push(`# Brief: ${status.feature} / Checkpoint ${status.activeCheckpoint} (${status.checkpointRange})`, "");
  lines.push(`HEAD: ${status.head}`);
  lines.push(`Completadas: ${status.completedTasks}/${status.totalTasks} — Primera pendiente: ${status.firstPendingTask ?? "(ninguna)"}`, "");
  lines.push("## Tareas del rango (implementa EXACTAMENTE estas, en orden)");
  for (const t of rangeTasks) lines.push(`- ${t.id} ${t.text}`.trimEnd());
  lines.push("", "## Fuentes canónicas (leer por path; NO copiar)");
  lines.push(`- ${status.paths.tasks} (única fuente de estado)`);
  lines.push(`- ${status.paths.featureDir}/spec.md, plan.md, research.md, data-model.md, contracts/`);
  lines.push("- AGENTS.md, .specify/memory/constitution.md");
  lines.push("- docs/product/ (visión y guardrails)");
  lines.push("", "## Gates (antes de finalizar)");
  lines.push("- npm run typecheck && npm run lint && npm test && npm run build && git diff --check");
  lines.push("", "## Fuera de alcance");
  lines.push(next ? `- NO implementar la siguiente tarea: ${next.id} ${next.text}`.trimEnd() : "- No hay tareas posteriores.");
  lines.push("- No iniciar checkpoints posteriores ni crear audit.md salvo que el rango lo indique.");
  lines.push("", "## Working tree permitido");
  lines.push(`- Solo untracked: ${status.allowedUntracked.join(", ")}`);
  lines.push("", "## Commit");
  lines.push("- Un único commit; staging quirúrgico; NUNCA `git add .` / `git add -A`.");
  lines.push("- Excluir `.agents/skills/speckit-agent-context-update/`.");
  lines.push("- Usar el mensaje de commit sugerido por el checkpoint en tasks.md.");
  lines.push("", "## Informe final breve");
  lines.push("- Estado, commit, tareas marcadas, gates, working tree. Sin recapitulaciones largas.");
  return lines.join("\n");
}
