import { isOverdue, isoDay } from "../core/schedule";
import type { PhaseState } from "../core/spec-state";
import { blockers, neighborhood } from "../graph/neighborhood";
import { isFinished, type SpecNode } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { needsYou } from "./attention";
import type { BaseRef, BoardInputs, SpecStage } from "./inputs";
import { BOARD_VERSION, type Board, type BlockedRow, type ReadyRow } from "./model";
import { rowKey } from "./phase-keys";
import { rankReady, unblockCounts } from "./rank";

const FETCH_LOCK_FAILURE = /cannot lock ref/;

interface Placement {
  inputs: BoardInputs;
  today: string;
  unblocks: ReadonlyMap<string, number>;
}

interface SpecLanes {
  ready: ReadyRow[];
  blocked: BlockedRow[];
}

export function buildBoard(inputs: BoardInputs, now: Date): Board {
  const today = isoDay(now);
  const open = [...inputs.nodes.values()].filter((node) => !isFinished(node));
  const active = open.filter((node) => node.status !== "paused");
  const placement: Placement = { inputs, today, unblocks: unblockCounts(inputs.states, inputs.nodes) };
  const lanes = active.map((node) => specLanes(node, placement));
  const { duplicates, ...counts } = inputs.counts;
  return {
    version: BOARD_VERSION,
    repo: inputs.repo,
    generatedAt: now.toISOString(),
    base: baseHeader(inputs.base),
    lanes: {
      inFlight: [],
      ready: rankReady(lanes.flatMap((spec) => spec.ready)),
      blocked: lanes.flatMap((spec) => spec.blocked),
      needsYou: needsYou(active, inputs, today),
    },
    footer: { ...counts, paused: open.length - active.length, backlog: inputs.backlogCount, duplicates },
  };
}

function specLanes(node: SpecNode, placement: Placement): SpecLanes {
  const name = node.spec.name;
  const stage = placement.inputs.stages.get(name);
  if (stage) return stageLanes(node, stage, placement);
  const state = placement.inputs.states.get(name);
  if (!state) return { ready: [], blocked: [] };
  const { ready, waiting } = readySet(state, placement.inputs.nodes);
  return {
    ready: ready.map((phase) => phaseRow(node, phase, placement)),
    blocked: waiting.map(({ phase, reasons }) => ({ spec: name, phase: phase.id, reasons })),
  };
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

function phaseRow(node: SpecNode, phase: PhaseState, { today, unblocks }: Placement): ReadyRow {
  const name = node.spec.name;
  const due = phase.schedule.due ?? node.meta.due;
  return {
    spec: name,
    phase: phase.id,
    target: { newWorktree: `${name}-${phase.id}` },
    next: "execute",
    prGroup: phase.edges.pr,
    priority: phase.schedule.priority ?? node.meta.priority,
    due,
    overdue: isOverdue(due, today),
    updated: node.meta.updated,
    unblocks: unblocks.get(rowKey({ spec: name, phase: phase.id })) ?? 0,
    safe: true,
  };
}

function baseHeader(base: BaseRef): Board["base"] {
  const { branch, sha, date, fetch } = base;
  if (fetch === "local") return { branch, sha, date, mode: "local" };
  if (fetch.ok) return { branch, sha, date, mode: "fetched" };
  return { branch, sha, date, mode: FETCH_LOCK_FAILURE.test(fetch.reason) ? "busy" : "offline", reason: fetch.reason };
}
