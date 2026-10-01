import { isOverdue, isoDay } from "../core/schedule";
import type { PhaseState } from "../core/spec-state";
import { blockers, neighborhood } from "../graph/neighborhood";
import { isFinished, type SpecNode } from "../graph/nodes";
import { readySet } from "../ready/ready-set";
import { needsYou } from "./attention";
import type { BaseRef, BoardInputs, SpecStage } from "./inputs";
import { BOARD_VERSION, type Board, type BlockedRow, type ReadyRow } from "./model";

const FETCH_LOCK_FAILURE = /cannot lock ref/;

interface SpecLanes {
  ready: ReadyRow[];
  blocked: BlockedRow[];
}

export function buildBoard(inputs: BoardInputs, now: Date): Board {
  const today = isoDay(now);
  const open = [...inputs.nodes.values()].filter((node) => !isFinished(node));
  const active = open.filter((node) => node.status !== "paused");
  const lanes = active.map((node) => specLanes(node, inputs, today));
  const { duplicates, ...counts } = inputs.counts;
  return {
    version: BOARD_VERSION,
    repo: inputs.repo,
    generatedAt: now.toISOString(),
    base: baseHeader(inputs.base),
    lanes: {
      inFlight: [],
      ready: lanes.flatMap((spec) => spec.ready),
      blocked: lanes.flatMap((spec) => spec.blocked),
      needsYou: needsYou(active, inputs, today),
    },
    footer: { ...counts, paused: open.length - active.length, backlog: inputs.backlogCount, duplicates },
  };
}

function specLanes(node: SpecNode, inputs: BoardInputs, today: string): SpecLanes {
  const name = node.spec.name;
  const stage = inputs.stages.get(name);
  if (stage) return stageLanes(node, stage, inputs, today);
  const state = inputs.states.get(name);
  if (!state) return { ready: [], blocked: [] };
  const { ready, waiting } = readySet(state, inputs.nodes);
  return {
    ready: ready.map((phase) => phaseRow(node, phase, today)),
    blocked: waiting.map(({ phase, reasons }) => ({ spec: name, phase: phase.id, reasons })),
  };
}

function stageLanes(node: SpecNode, stage: SpecStage, inputs: BoardInputs, today: string): SpecLanes {
  const name = node.spec.name;
  const reasons = blockers(neighborhood(inputs.nodes, name)).map((link) => `needs ${link.other}${link.phases ? `#${link.phases}` : ""}`);
  if (reasons.length > 0) return { ready: [], blocked: [{ spec: name, reasons }] };
  const { priority, due, updated } = node.meta;
  const row: ReadyRow = { spec: name, next: stage, target: { newWorktree: name }, priority, due, overdue: isOverdue(due, today), updated, unblocks: 0, safe: true };
  return { ready: [row], blocked: [] };
}

function phaseRow(node: SpecNode, phase: PhaseState, today: string): ReadyRow {
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
    unblocks: 0,
    safe: true,
  };
}

function baseHeader(base: BaseRef): Board["base"] {
  const { branch, sha, date, fetch } = base;
  if (fetch === "local") return { branch, sha, date, mode: "local" };
  if (fetch.ok) return { branch, sha, date, mode: "fetched" };
  return { branch, sha, date, mode: FETCH_LOCK_FAILURE.test(fetch.reason) ? "busy" : "offline", reason: fetch.reason };
}
