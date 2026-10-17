import { isOverdue, isoDay } from "../core/schedule";
import type { PhaseState, SpecState } from "../core/spec-state";
import { blockers, neighborhood } from "../graph/neighborhood";
import { isFinished, type SpecNode } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { phaseActivity, type PhaseActivity } from "./activity";
import { needsYou } from "./attention";
import { flightRows, isOnBoard, readyInWorkspaces } from "./flight";
import { focusLane, focusOrder, withFocusPositions } from "./focus";
import { joinFlightRows } from "./joins";
import { parkedPhases } from "./parked";
import type { BaseRef, BoardInputs, WorkspaceView } from "./inputs";
import { BOARD_VERSION, type Board, type BlockedRow, type NextStep, type ReadyRow } from "./model";
import { rowKey } from "./phase-keys";
import { markSafe, rankReady, unblockCounts } from "./rank";
import { treeTarget, workspaceTarget, type TreeTarget } from "./tree-target";

const FETCH_LOCK_FAILURE = /cannot lock ref/;

interface Placement {
  inputs: BoardInputs;
  today: string;
  unblocks: ReadonlyMap<string, number>;
  activity: ReadonlyMap<string, PhaseActivity>;
  inFlight: ReadonlySet<string>;
  // Phases parked on a question: neither ready nor blocked until it's answered.
  parked: ReadonlySet<string>;
}

// A spec that exists only on a branch: its rows run in that worktree.
interface BranchOrigin {
  workspace: string;
  branch: string;
}

interface SpecLanes {
  ready: ReadyRow[];
  blocked: BlockedRow[];
}

export function buildBoard(inputs: BoardInputs, now: Date, me?: string): Board {
  const today = isoDay(now);
  const open = [...inputs.nodes.values()].filter((node) => !isFinished(node));
  const active = open.filter((node) => node.status !== "paused");
  const activity = phaseActivity(inputs.states, inputs.workspaces);
  const inFlight = joinFlightRows(flightRows(activity, inputs), inputs);
  const parked = parkedPhases(inputs);
  const placement: Placement = { inputs, today, unblocks: unblockCounts(inputs.states, inputs.nodes), activity, inFlight: new Set(inFlight.map(rowKey)), parked: new Set(parked.keys()) };
  const lanes = [...active.map((node) => specLanes(node, placement)), ...branchOnlyLanes(inputs.workspaces, placement)];
  const order = focusOrder(inputs, today);
  const ready = rankReady(withFocusPositions(markSafe(lanes.flatMap((spec) => spec.ready), inFlight, withBranchOnlyNodes(inputs), inputs.states), order));
  const blocked = lanes.flatMap((spec) => spec.blocked);
  const focus = focusLane({ inFlight, ready, blocked }, order, inputs, me);
  const { duplicates, ...counts } = inputs.counts;
  return {
    version: BOARD_VERSION,
    repo: inputs.repo,
    generatedAt: now.toISOString(),
    here: inputs.currentPath,
    ...(me ? { me } : {}),
    ...mainCheckout(inputs.workspaces),
    base: baseHeader(inputs.base),
    lanes: { focus: focus.rows, inFlight, ready, blocked, needsYou: needsYou(active, inputs, now, inFlight, parked.values()) },
    footer: {
      ...counts,
      paused: open.length - active.length,
      backlog: inputs.backlogCount,
      duplicates,
      ...unavailable(inputs),
      ...(focus.otherSessions.length > 0 ? { otherSessions: focus.otherSessions } : {}),
    },
  };
}

function unavailable({ prs, sessions }: BoardInputs): Pick<Board["footer"], "prs" | "sessions"> {
  return { ...(prs !== "local" && !prs.ok ? { prs: prs.reason } : {}), ...(sessions !== "local" && !sessions.ok ? { sessions: sessions.reason } : {}) };
}

function specLanes(node: SpecNode, placement: Placement): SpecLanes {
  const stage = placement.inputs.stages.get(node.spec.name);
  if (stage) return stageLanes(node, stage, placement);
  const state = placement.inputs.states.get(node.spec.name);
  if (!state) return { ready: [], blocked: [] };
  return openSpecLanes(node, state, placement);
}

// A stale spec, like an unreviewed one, offers its review in place of its phases.
function openSpecLanes(node: SpecNode, state: SpecState, placement: Placement, origin?: BranchOrigin): SpecLanes {
  const review = node.meta.stale !== undefined || awaitsReview(state, placement);
  return review ? stageLanes(node, "review", placement, origin) : phaseLanes(node, state, placement, origin);
}

// A written spec's next session is its review, until a review lands anywhere or a phase starts.
function awaitsReview(state: SpecState, { inputs, inFlight }: Placement): boolean {
  const name = state.spec.name;
  const copies = [state, ...inputs.workspaces.flatMap((workspace) => workspace.states.get(name) ?? [])];
  const started = state.phases.some((phase) => inFlight.has(rowKey({ spec: name, phase: phase.id })));
  return state.phases.length > 0 && !started && copies.every((copy) => copy.reviewed === false && !copy.phases.some((phase) => phase.done));
}

function phaseLanes(node: SpecNode, state: SpecState, placement: Placement, origin?: BranchOrigin): SpecLanes {
  const name = node.spec.name;
  const landed = (phase: PhaseState) => {
    const key = rowKey({ spec: name, phase: phase.id });
    return !placement.inFlight.has(key) && !placement.parked.has(key);
  };
  const { ready, waiting } = readySet(state, placement.inputs.nodes);
  const readyIn = readyInWorkspaces(state, placement.activity, placement.inputs.nodes);
  const lanes: SpecLanes = { ready: ready.filter(landed).map((phase) => phaseRow(node, state, phase, placement, origin)), blocked: [] };
  for (const { phase, reasons } of waiting.filter(({ phase }) => landed(phase))) {
    const inWorkspace = readyIn.get(phase.id);
    if (inWorkspace) lanes.ready.push(readyInRow(phaseRow(node, state, phase, placement), inWorkspace, placement.inputs));
    else lanes.blocked.push({ spec: name, phase: phase.id, ...(origin ? { target: { workspace: origin.workspace } } : {}), reasons });
  }
  return lanes;
}

// Ready only where its needs are ticked: that worktree is the target, busy or not.
function readyInRow(row: ReadyRow, readyIn: NonNullable<ReadyRow["readyIn"]>, inputs: BoardInputs): ReadyRow {
  const { treeBusy: _groupTree, ...rest } = row;
  const { target, busy } = workspaceTarget(readyIn.workspace, inputs);
  return { ...rest, target, readyIn, safe: false, ...(busy ? { treeBusy: busy } : {}) };
}

// The first worktree holding a branch-only spec stands in for its base (as in phaseActivity).
function branchOnlyLanes(workspaces: readonly WorkspaceView[], placement: Placement): SpecLanes[] {
  const seen = new Set<string>();
  return workspaces.flatMap((workspace) =>
    [...workspace.branchOnly].flatMap(([name, node]) => {
      const state = workspace.states.get(name);
      if (seen.has(name) || placement.inputs.nodes.has(name) || !state || !isOnBoard(node)) return [];
      seen.add(name);
      const origin = { workspace: workspace.path, branch: workspace.branch ?? workspace.path };
      return [openSpecLanes(node, state, placement, origin)];
    }),
  );
}

function stageLanes(node: SpecNode, step: Exclude<NextStep, "execute">, { inputs, today, unblocks }: Placement, origin?: BranchOrigin): SpecLanes {
  const name = node.spec.name;
  const target = origin ? { workspace: origin.workspace } : { newWorktree: name };
  const reasons = blockers(neighborhood(inputs.nodes, name)).map((link) => `needs ${link.other}${link.phases ? `#${link.phases}` : ""}`);
  if (reasons.length > 0) return { ready: [], blocked: [{ spec: name, ...(origin ? { target } : {}), reasons }] };
  const { priority, due, updated, stale } = node.meta;
  const row: ReadyRow = {
    spec: name,
    next: step,
    title: node.title ?? name,
    target,
    ...(origin ? { onlyOn: origin.branch } : {}),
    priority,
    due,
    overdue: isOverdue(due, today),
    updated,
    unblocks: unblocks.get(rowKey({ spec: name })) ?? 0,
    safe: origin === undefined,
    ...(stale ? { stale } : {}),
  };
  return { ready: [row], blocked: [] };
}

function phaseRow(node: SpecNode, state: SpecState, phase: PhaseState, { inputs, activity, today, unblocks }: Placement, origin?: BranchOrigin): ReadyRow {
  const name = node.spec.name;
  const due = phase.schedule.due ?? node.meta.due;
  const tree: TreeTarget = origin ? { target: { workspace: origin.workspace } } : treeTarget(state, phase.id, inputs, activity);
  return {
    spec: name,
    phase: phase.id,
    target: tree.target,
    ...(tree.busy ? { treeBusy: tree.busy } : {}),
    ...(origin ? { onlyOn: origin.branch } : {}),
    next: "execute",
    title: phase.name,
    prGroup: phase.edges.pr,
    priority: phase.schedule.priority ?? node.meta.priority,
    due,
    overdue: isOverdue(due, today),
    updated: node.meta.updated,
    unblocks: unblocks.get(rowKey({ spec: name, phase: phase.id })) ?? 0,
    safe: origin === undefined && tree.busy === undefined,
  };
}

// Overlap only: a branch-only spec in flight still edits the files its code map names.
function withBranchOnlyNodes(inputs: BoardInputs): Map<string, SpecNode> {
  const nodes = new Map(inputs.nodes);
  for (const workspace of inputs.workspaces) for (const [name, node] of workspace.branchOnly) if (!nodes.has(name)) nodes.set(name, node);
  return nodes;
}

function mainCheckout(workspaces: readonly WorkspaceView[]): Pick<Board, "mainCheckout"> {
  const main = workspaces.find((workspace) => workspace.isMain);
  return main ? { mainCheckout: main.path } : {};
}

function baseHeader(base: BaseRef): Board["base"] {
  const { branch, sha, date, fetch } = base;
  if (fetch === "local") return { branch, sha, date, mode: "local" };
  if (fetch.ok) return { branch, sha, date, mode: "fetched" };
  return { branch, sha, date, mode: FETCH_LOCK_FAILURE.test(fetch.reason) ? "busy" : "offline", reason: fetch.reason };
}
