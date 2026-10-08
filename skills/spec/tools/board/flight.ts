import type { SpecState } from "../core/spec-state";
import { isFinished, type SpecNode } from "../graph/nodes";
import { phaseNeeds, readySet } from "../ready/ready-set";
import type { PhaseActivity } from "./activity";
import { heldName } from "../claims/rules";
import type { BoardInputs, HeldClaim } from "./inputs";
import type { FlightRow } from "./model";
import { resolvedPhaseKeys, rowKey, splitKey } from "./phase-keys";

export interface WorkspaceReady {
  workspace: string;
  needs: string[];
}

const KEY_ORDER = new Intl.Collator("en", { numeric: true });

const NO_ACTIVITY: PhaseActivity = { tickedIn: [], wipIn: [] };

export function flightRows(activity: ReadonlyMap<string, PhaseActivity>, inputs: BoardInputs): FlightRow[] {
  const claims = claimsOnBoard(inputs);
  return [...new Set([...activity.keys(), ...claims.keys()])]
    .map((key) => ({ ...splitKey(key), ...(activity.get(key) ?? NO_ACTIVITY), held: claims.get(key) }))
    .filter(({ spec }) => isOnBoard(specNode(spec, inputs)))
    .toSorted((a, b) => KEY_ORDER.compare(rowKey(a), rowKey(b)))
    .map(({ spec, phase, tickedIn, wipIn, held }): FlightRow => {
      const [workspace = held?.status === "remote" ? "" : (held?.claim.workspace ?? ""), ...alsoIn] = tickedIn.length > 0 ? tickedIn : wipIn;
      const prGroup = workspaceState(spec, workspace, inputs)?.phases.find((candidate) => candidate.id === phase)?.edges.pr;
      return {
        spec,
        phase,
        ...(prGroup ? { prGroup } : {}),
        workspace,
        ...(alsoIn.length > 0 && tickedIn.length > 0 ? { alsoIn } : {}),
        ...(held ? { holder: heldName(held) } : {}),
        ...(workspace ? { target: { workspace } } : {}),
        next: tickedIn.length > 0 ? "ticked on branch, not merged" : "executing",
      };
    });
}

// Done claims are finished work and gone ones lost their worktree: neither is in flight. When a phase has
// both, the local claim (listed last) wins over another machine's.
export function claimsOnBoard(inputs: BoardInputs): Map<string, HeldClaim> {
  const shown = inputs.claims.filter((held) => held.status !== "done" && held.status !== "gone");
  return new Map(shown.map((held) => [rowKey(held.claim), held]));
}

// Phases that become ready when one workspace's ticks count as done. Base stays untouched: each
// workspace gets its own copy, and a phase ready in more than one stays blocked.
export function readyInWorkspaces(state: SpecState, activity: ReadonlyMap<string, PhaseActivity>, nodes: ReadonlyMap<string, SpecNode>): Map<string, WorkspaceReady> {
  const candidates = new Map<string, WorkspaceReady[]>();
  for (const [workspace, ticked] of tickedByWorkspace(state.spec.name, activity)) {
    const overlay = { ...state, phases: state.phases.map((phase) => (ticked.has(phase.id) ? { ...phase, done: true } : phase)) };
    for (const phase of readySet(overlay, nodes).ready) {
      const index = state.phases.findIndex((candidate) => candidate.id === phase.id);
      const needed = resolvedPhaseKeys(phaseNeeds(state, phase, index), state, nodes).map((target) => target.key);
      const needs = [...ticked].filter((id) => needed.includes(rowKey({ spec: state.spec.name, phase: id })));
      candidates.set(phase.id, [...(candidates.get(phase.id) ?? []), { workspace, needs }]);
    }
  }
  return new Map([...candidates].flatMap(([phase, found]) => (found.length === 1 && found[0] ? [[phase, found[0]] as const] : [])));
}

export function specNode(spec: string, inputs: BoardInputs): SpecNode | undefined {
  return inputs.nodes.get(spec) ?? inputs.workspaces.find((workspace) => workspace.branchOnly.has(spec))?.branchOnly.get(spec);
}

export function isOnBoard(node: SpecNode | undefined): node is SpecNode {
  return node !== undefined && !isFinished(node) && node.status !== "paused";
}

function tickedByWorkspace(spec: string, activity: ReadonlyMap<string, PhaseActivity>): Map<string, Set<string>> {
  const byWorkspace = new Map<string, Set<string>>();
  for (const [key, { tickedIn }] of activity) {
    const { spec: owner, phase } = splitKey(key);
    if (owner !== spec || phase === undefined) continue;
    for (const workspace of tickedIn) byWorkspace.set(workspace, (byWorkspace.get(workspace) ?? new Set()).add(phase));
  }
  return byWorkspace;
}

function workspaceState(spec: string, path: string, inputs: BoardInputs): SpecState | undefined {
  return inputs.workspaces.find((workspace) => workspace.path === path)?.states.get(spec);
}
