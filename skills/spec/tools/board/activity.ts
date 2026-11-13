import type { PhaseState, SpecState } from "../core/spec-state";
import type { WorkspaceView } from "./inputs";
import { rowKey } from "./phase-keys";

export interface PhaseActivity {
  tickedIn: string[];
  wipIn: string[];
  // A joined phase whose tasks are all done, waiting on its PR group's PR.
  built?: { prGroup: string; prNotOpened: boolean };
}

// Workspace states are compared with base and never merged into it: readySet and isFinished see base only.
// A joined spec has no workspace states (the overlay skips it); its activity comes in as `joined`.
export function phaseActivity(baseStates: ReadonlyMap<string, SpecState>, workspaces: readonly WorkspaceView[], joined: ReadonlyMap<string, PhaseActivity> = new Map()): Map<string, PhaseActivity> {
  const activity = new Map<string, PhaseActivity>(joined);
  const record = (key: string, kind: "tickedIn" | "wipIn", path: string) => {
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

function changeKind(phase: PhaseState, onBase: PhaseState | undefined): "tickedIn" | "wipIn" | undefined {
  if (onBase?.done) return undefined;
  if (phase.done) return "tickedIn";
  return checkedItems(phase) > checkedItems(onBase) ? "wipIn" : undefined;
}

function checkedItems(phase: PhaseState | undefined): number {
  return phase?.summary?.deliverables.checked ?? 0;
}
