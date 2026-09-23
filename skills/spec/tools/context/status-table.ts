import type { PhaseState, SpecState } from "../core/spec-state";
import { truncate } from "./text";

const DELIVERS_LIMIT = 80;
const WORK_LIMIT = 100;
const HEADER = "| Phase | Status | Delivers | Work |\n|-------|--------|----------|------|";

export function phaseStatuses(phases: readonly PhaseState[]): string[] {
  let activeClaimed = false;
  return phases.map((phase) => {
    if (phase.done) return "✅ done";
    if (!phase.summary) return "⬜ MISSING";
    const { checked, unchecked } = phase.summary.deliverables;
    if (checked > 0) {
      activeClaimed = true;
      return `🟡 WIP (${checked}/${checked + unchecked})`;
    }
    if (activeClaimed) return "⬜ pending";
    activeClaimed = true;
    return "🟢 active";
  });
}

export function renderStatusTable(state: SpecState): string {
  const title = `# ${state.spec.name} — Status`;
  if (state.phases.length === 0) return `${title}\n\n${HEADER}\n| — | — | No phases planned yet. | — |`;

  const statuses = phaseStatuses(state.phases);
  const rows = state.phases.map((phase, index) => renderRow(phase, statuses[index] ?? ""));
  return `${title}\n\n${HEADER}\n${rows.join("\n")}\n\n${summaryLine(state.phases, statuses)}`;
}

function renderRow(phase: PhaseState, status: string): string {
  const label = `${phase.id} — ${phase.name}`;
  if (!phase.summary) return row([label, status, `${phase.pointer} not found.`, "N/A"]);
  const delivers = truncate(phase.summary.goal ?? phase.name, DELIVERS_LIMIT);
  const work = phase.summary.work ? truncate(phase.summary.work, WORK_LIMIT) : "N/A";
  return row([label, status, delivers, work]);
}

function row(cells: string[]): string {
  return `| ${cells.map((cell) => cell.replaceAll("|", "\\|")).join(" | ")} |`;
}

function summaryLine(phases: readonly PhaseState[], statuses: readonly string[]): string {
  const done = phases.filter((phase) => phase.done).length;
  const wip = statuses.filter((status) => status.startsWith("🟡")).length;
  const focus = phases.find((phase) => !phase.done);
  const focusText = focus ? ` Currently focused: Phase ${focus.id} — ${focus.name}.` : "";
  return `**${done} of ${phases.length} done. ${wip} WIP.**${focusText}`;
}
