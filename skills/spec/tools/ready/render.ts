import type { PhaseState, SpecState } from "../core/spec-state";
import { DEFAULT_PR_GROUP } from "../plan/docs/pr-doc";
import type { SpecLayout } from "../pr/groups";
import type { BuildOrder, ShipAloneSuggestion } from "./build-order";
import { isWip, type ReadySet } from "./ready-set";

export function renderReadySet(set: ReadySet): string {
  const ready = set.ready.map((phase) => `${phase.id} ${phase.name}${isWip(phase) ? " (in progress)" : ""}`);
  const head = `Ready now: ${ready.length > 0 ? ready.join(" · ") : "none"}`;
  if (!set.edgesDeclared) {
    const rest = set.waiting.length > 0 ? `\nWaiting: the other ${set.waiting.length} open phases, in progress.md order` : "";
    return `${head}${rest}\n(No phase file declares needs / same-files-as yet, so the order is linear.)`;
  }
  const lines = set.waiting.map((wait) => `Waiting: ${wait.phase.id} ${wait.phase.name}: ${wait.reasons.join("; ")}`);
  return [head, ...lines].join("\n");
}

export function renderPrGroups(state: SpecState): string {
  const label = (phase: PhaseState) => `${phase.id}${phase.done ? " ✓" : ""}`;
  const groups = new Map<string, string[]>();
  for (const phase of state.phases.filter((p) => p.code)) {
    const key = phase.edges.pr ?? "(no pr field)";
    groups.set(key, [...(groups.get(key) ?? []), label(phase)]);
  }
  const prLines = [...groups.entries()].map(([pr, ids]) => `PR ${pr}: phases ${ids.join(", ")}`);
  const tasks = state.phases.filter((phase) => !phase.code).map(label);
  return [...prLines, ...(tasks.length > 0 ? [`Task phases (no PR): ${tasks.join(", ")}`] : [])].join("\n");
}

export function renderBuildOrder(order: BuildOrder, layout: SpecLayout, suggestions: readonly ShipAloneSuggestion[]): string {
  const waiting = new Set(order.waiting.map((wait) => wait.phase.id));
  const lines = order.cycle ? [`Cycle: ${order.cycle.join(" → ")}`] : [orderLine(order, waiting), longestLine(order)];
  return [...lines, ...laneLines(layout, suggestions), sameFilesLine(order), waitingLine(order)].filter((line) => line !== undefined).join("\n");
}

function orderLine(order: BuildOrder, waiting: ReadonlySet<string>): string {
  const shown = (phase: PhaseState) => `${phase.id}${phase.code ? "" : " (task)"}${waiting.has(phase.id) ? " (waiting)" : ""}`;
  const batches = order.batches.map((batch) => (batch.length === 1 ? shown(batch[0] as PhaseState) : `[${batch.map(shown).join(" · ")}]`));
  return `Order: ${batches.length > 0 ? batches.join(" → ") : "nothing open"}`;
}

function longestLine({ longest }: BuildOrder): string | undefined {
  if (longest.length === 0) return undefined;
  return `Longest: ${longest.map((phase) => phase.id).join(" → ")} (${longest.length} phase${longest.length === 1 ? "" : "s"})`;
}

function laneLines(layout: SpecLayout, suggestions: readonly ShipAloneSuggestion[]): (string | undefined)[] {
  const lanes = [...layout.groups.entries()].filter(([group]) => group !== DEFAULT_PR_GROUP);
  if (lanes.length === 0) return ["Lanes: none (no pr: groups)"];
  const open = lanes
    .map(([group, lane]) => ({ group, lane, ids: lane.phases.filter((phase) => !phase.done).map((phase) => phase.id) }))
    .filter(({ ids }) => ids.length > 0)
    .map(({ group, lane, ids }) => `${group} ${ids.join(",")}${lane.shipsAlone ? " (ships alone)" : ""}`);
  const fresh = suggestions.filter((suggestion) => !layout.groups.get(suggestion.group)?.shipsAlone);
  const reason = ({ group, targets }: ShipAloneSuggestion) =>
    `${group} (${targets.join(", ")} ${targets.length === 1 ? "is a needs-deployed target" : "are needs-deployed targets"})`;
  return [
    `Lanes: ${open.length > 0 ? open.join(" · ") : "none open"}`,
    fresh.length > 0 ? `Ships alone? ${fresh.map(reason).join(" · ")}` : undefined,
    layout.ungrouped.length > 0 ? `No lane: ${layout.ungrouped.map((phase) => phase.id).join(", ")} (give them a pr: group before spec-branch mode)` : undefined,
  ];
}

function sameFilesLine({ sameFiles }: BuildOrder): string | undefined {
  if (sameFiles.length === 0) return undefined;
  return `Same files: ${sameFiles.map(({ first, then }) => `${first.id} and ${then.id} (${then.id} runs after ${first.id})`).join(" · ")}`;
}

function waitingLine({ waiting }: BuildOrder): string | undefined {
  if (waiting.length === 0) return undefined;
  return `Waiting: ${waiting.map(({ phase, reasons }) => `${phase.id} ${reasons.join("; ")}`).join(" · ")}`;
}
