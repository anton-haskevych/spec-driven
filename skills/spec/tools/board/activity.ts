import type { PhaseState, SpecState } from "../core/spec-state";
import type { WorkspaceView } from "./inputs";
import { rowKey } from "./phase-keys";

export interface PhaseActivity {
  tickedIn: string[];
  wipIn: string[];
}

// Workspace states are compared with base and never merged into it: readySet and isFinished see base only.
export function phaseActivity(baseStates: ReadonlyMap<string, SpecState>, workspaces: readonly WorkspaceView[]): Map<string, PhaseActivity> {
  const activity = new Map<string, PhaseActivity>();
  const record = (key: string, kind: keyof PhaseActivity, path: string) => {
    const entry = activity.get(key) ?? { tickedIn: [], wipIn: [] };
    entry[kind].push(path);
    activity.set(key, entry);
  };
  const branchBase = new Map<string, SpecState>();
  for (const workspace of workspaces) {
    for (const [name, state] of workspace.states) {
      const base = baseStates.get(name) ?? branchBase.get(name);
      if (!base) {
        branchBase.set(name, state);
        continue;
      }
      for (const phase of state.phases) {
        const kind = changeKind(phase, base.phases.find((candidate) => candidate.id === phase.id));
        if (kind) record(rowKey({ spec: name, phase: phase.id }), kind, workspace.path);
      }
    }
  }
  return activity;
}

function changeKind(phase: PhaseState, onBase: PhaseState | undefined): keyof PhaseActivity | undefined {
  if (onBase?.done) return undefined;
  if (phase.done) return "tickedIn";
  return checkedItems(phase) > checkedItems(onBase) ? "wipIn" : undefined;
}

function checkedItems(phase: PhaseState | undefined): number {
  return phase?.summary?.deliverables.checked ?? 0;
}
