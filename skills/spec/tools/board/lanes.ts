import { isOverdue, isoDay } from "../core/schedule";
import type { PhaseState, SpecState } from "../core/spec-state";
import { blockers, neighborhood } from "../graph/neighborhood";
import { isFinished, type SpecNode } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { phaseActivity, type PhaseActivity } from "./activity";
import { needsYou } from "./attention";
import { flightRows, isOnBoard, readyInWorkspaces } from "./flight";
import { joinFlightRows } from "./joins";
import type { BaseRef, BoardInputs, SpecStage, WorkspaceView } from "./inputs";
import { BOARD_VERSION, type Board, type BlockedRow, type ReadyRow } from "./model";
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

export function buildBoard(inputs: BoardInputs, now: Date): Board {
  const today = isoDay(now);
  const open = [...inputs.nodes.values()].filter((node) => !isFinished(node));
  const active = open.filter((node) => node.status !== "paused");
  const activity = phaseActivity(inputs.states, inputs.workspaces);
  const inFlight = joinFlightRows(flightRows(activity, inputs), inputs);
  const placement: Placement = { inputs, today, unblocks: unblockCounts(inputs.states, inputs.nodes), activity, inFlight: new Set(inFlight.map(rowKey)) };
  const lanes = [...active.map((node) => specLanes(node, placement)), ...branchOnlyLanes(inputs.workspaces, placement)];
  const { duplicates, ...counts } = inputs.counts;
  return {
    version: BOARD_VERSION,
    repo: inputs.repo,
    generatedAt: now.toISOString(),
    here: inputs.currentPath,
    ...mainCheckout(inputs.workspaces),
    base: baseHeader(inputs.base),
    lanes: {
      inFlight,
      ready: rankReady(markSafe(lanes.flatMap((spec) => spec.ready), inFlight, withBranchOnlyNodes(inputs), inputs.states)),
      blocked: lanes.flatMap((spec) => spec.blocked),
      needsYou: needsYou(active, inputs, now, inFlight),
    },
    footer: { ...counts, paused: open.length - active.length, backlog: inputs.backlogCount, duplicates, ...unavailable(inputs) },
  };
}

function unavailable({ prs, sessions }: BoardInputs): Pick<Board["footer"], "prs" | "sessions"> {
  return { ...(prs !== "local" && !prs.ok ? { prs: prs.reason } : {}), ...(sessions !== "local" && !sessions.ok ? { sessions: sessions.reason } : {}) };
}

function specLanes(node: SpecNode, placement: Placement): SpecLanes {
  const stage = placement.inputs.stages.get(node.spec.name);
  if (stage) return stageLanes(node, stage, placement);
  const state = placement.inputs.states.get(node.spec.name);
  return state ? phaseLanes(node, state, placement) : { ready: [], blocked: [] };
}

function phaseLanes(node: SpecNode, state: SpecState, placement: Placement, origin?: BranchOrigin): SpecLanes {
  const name = node.spec.name;
  const landed = (phase: PhaseState) => !placement.inFlight.has(rowKey({ spec: name, phase: phase.id }));
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
      return [phaseLanes(node, state, placement, { workspace: workspace.path, branch: workspace.branch ?? workspace.path })];
    }),
  );
}

function stageLanes(node: SpecNode, stage: SpecStage, { inputs, today, unblocks }: Placement): SpecLanes {
  const name = node.spec.name;
  const reasons = blockers(neighborhood(inputs.nodes, name)).map((link) => `needs ${link.other}${link.phases ? `#${link.phases}` : ""}`);
  if (reasons.length > 0) return { ready: [], blocked: [{ spec: name, reasons }] };
  const { priority, due, updated } = node.meta;
  const row: ReadyRow = {
    spec: name,
    next: stage,
    target: { newWorktree: name },
    priority,
    due,
    overdue: isOverdue(due, today),
    updated,
    unblocks: unblocks.get(rowKey({ spec: name })) ?? 0,
    safe: true,
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
