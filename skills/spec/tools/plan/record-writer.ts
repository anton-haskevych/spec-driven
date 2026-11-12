import { phaseInFlightFile } from "../core/in-flight";
import { openPark } from "../core/park";
import { isCalendarDay } from "../core/schedule";
import type { SpecFolder } from "../core/spec-folders";
import { diskReader } from "../core/spec-state";
import { findPhaseDoc } from "./ops/change";
import { openRecordPark } from "./ops/phase-state";
import { PLAN_INTENTS } from "./plan-intents";
import type { PhaseDeps, PhaseOutcome, PhaseWriter } from "./phase-writer";
import { recordPlanCommand } from "./record-plan";
import { recordWorld } from "./record-send";
import { recordTick } from "./record-tick";
import type { JoinedPlan } from "./state-source";

// A joined spec: every action writes the record, one batch per command. A park answered here that was
// left in an in-flight file before parks moved onto the record is answered in that file.
export function recordWriter(projectDir: string, spec: SpecFolder, joined: JoinedPlan, files: PhaseWriter, deps: PhaseDeps): PhaseWriter {
  const name = spec.name;
  const send = (command: Parameters<typeof recordPlanCommand>[3]["command"], args: object, plan: Parameters<typeof recordPlanCommand>[3]["plan"]) =>
    recordPlanCommand(recordWorld(projectDir, deps), spec, joined, { command, args, plan });
  return {
    tick: (request) => recordTick(recordWorld(projectDir, deps), name, joined, request),
    add(request) {
      const intent = { spec: name, title: request.title, ...(request.after ? { after: request.after } : {}), edges: request.edges, tasks: [...(request.tasks ?? [])] };
      return send("add", intent, (see) => PLAN_INTENTS.add.plan(intent, see));
    },
    split(request) {
      const intent = { spec: name, id: request.id, titles: [...request.titles], items: request.titles.map((_, index) => [...(request.items.get(index) ?? [])]) };
      return send("split", intent, (see) => PLAN_INTENTS.split.plan(intent, see));
    },
    move(request) {
      const intent = { spec: name, tasks: [...request.tasks], to: request.to, ...(request.from ? { from: request.from } : {}) };
      return send("move", intent, (see) => PLAN_INTENTS.move.plan(intent, see));
    },
    set(request) {
      const intent = { spec: name, phase: request.phase, fields: request.fields };
      return send("set", intent, (see) => PLAN_INTENTS.set.plan(intent, see));
    },
    deployed(request) {
      if (!isCalendarDay(request.day)) return { kind: "invalid", reason: `--date "${request.day}" is not a date; use YYYY-MM-DD` };
      const intent = { spec: name, phase: request.phase, day: request.day };
      return send("deployed", intent, (see) => PLAN_INTENTS.deployed.plan(intent, see));
    },
    park(request) {
      const inFile = fileParkOf(spec, joined, request.phase);
      if (inFile) return { kind: "invalid", reason: `Phase ${inFile.phase} is already parked on "${inFile.question}"; ask both in one question` };
      const intent = { spec: name, phase: request.phase, question: request.question, ...(request.recommend ? { recommend: request.recommend } : {}), at: request.at };
      return send("park", intent, (see) => PLAN_INTENTS.park.plan(intent, see));
    },
    unpark(request): PhaseOutcome | Promise<PhaseOutcome> {
      const phase = findPhaseDoc(joined, request.phase);
      if (typeof phase !== "string" && !openRecordPark(phase) && fileParkOf(spec, joined, request.phase)) return files.unpark(request);
      const intent = { spec: name, phase: request.phase, answer: request.answer, at: request.at };
      return send("unpark", intent, (see) => PLAN_INTENTS.unpark.plan(intent, see));
    },
  };
}

function fileParkOf(spec: SpecFolder, joined: JoinedPlan, rawPhase: string): { phase: string; question: string } | undefined {
  const phase = findPhaseDoc(joined, rawPhase);
  if (typeof phase === "string") return undefined;
  const open = openPark(diskReader(spec.dir)(phaseInFlightFile(phase.id)) ?? "");
  return open ? { phase: phase.id, question: open.question } : undefined;
}
