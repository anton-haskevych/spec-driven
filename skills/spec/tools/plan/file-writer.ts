import { applyEdits } from "../core/apply-edits";
import type { SpecFolder } from "../core/spec-folders";
import { loadSpecStateFromFiles } from "../core/spec-state";
import { loadNodes } from "../graph/nodes";
import { planAdd } from "../phases/add";
import { planDeployed } from "../phases/deployed";
import { planMove } from "../phases/move";
import { planSet } from "../phases/set";
import { planNote } from "../phases/note";
import { planPark, planUnpark } from "../phases/park";
import { refsToPhase } from "../phases/review-refs";
import { planSplit, type Split } from "../phases/split";
import { planTask } from "../phases/task";
import { planTick } from "../phases/tick";
import type { LocalPilot } from "../runtime/workflow-capabilities";
import type { PhaseDeps, PhaseOutcome, PhaseWriter } from "./phase-writer";
import { specStatesAt } from "./read-plans";

// A spec on files: today's planners, each validated before applyEdits writes it.
export function fileWriter(projectDir: string, spec: SpecFolder, deps: PhaseDeps, workflow?: LocalPilot): PhaseWriter {
  return {
    tick(request) {
      const result = planTick(spec, request);
      if (result.plan.kind !== "ok") return { kind: "invalid", reason: result.plan.reason };
      applyEdits(result.plan);
      const ticked = `ticked "${result.item}" in Phase ${result.phaseId}`;
      return landed(result.phaseComplete ? `${ticked}\nPhase ${result.phaseId} complete — run update.md → Close the phase` : ticked);
    },
    park(request) {
      const result = planPark(spec, request);
      if (result.plan.kind !== "ok") return { kind: "invalid", reason: result.plan.reason };
      applyEdits(result.plan);
      const advice = request.recommend?.trim() ? ` · recommend: ${request.recommend.trim()}` : "";
      const followup = workflow ? "Commit the note locally, then hand off." : "Commit and push the note, then hand off.";
      return landed(`parked Phase ${result.phaseId} in ${result.file}: "${request.question.trim()}"${advice}\n${followup}`);
    },
    unpark(request) {
      const result = planUnpark(spec, request);
      if (result.plan.kind !== "ok") return { kind: "invalid", reason: result.plan.reason };
      applyEdits(result.plan);
      return landed(`answered Phase ${result.phaseId}: "${request.answer.trim()}"`);
    },
    deployed(request) {
      const result = planDeployed(spec, request);
      if (result.plan.kind === "invalid") return { kind: "invalid", reason: result.plan.reason };
      if (result.plan.kind === "unchanged") return { kind: "unchanged", line: result.plan.reason };
      applyEdits(result.plan);
      return landed(`Phase ${result.phaseId} marked deployed ${request.day}`);
    },
    add(request) {
      const result = planAdd(spec, request, loadNodes(projectDir));
      if (result.plan.kind !== "ok") return { kind: "invalid", reason: result.plan.reason };
      applyEdits(result.plan);
      return landed(`added Phase ${result.phaseId} — ${request.title} → ${result.pointer}\nFill in its Goal, Outcome, files and deliverables.`);
    },
    split(request) {
      const nodes = loadNodes(projectDir);
      const result = planSplit(spec, request, nodes);
      if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
      applyEdits(result.plan);
      const refs = refsToPhase(loadSpecStateFromFiles(spec), result.original.id, nodes, specStatesAt(projectDir, deps, deps.now()));
      return landed(splitLine(result, refs));
    },
    move(request) {
      const result = planMove(spec, request, loadNodes(projectDir));
      if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
      applyEdits(result.plan);
      return landed(`move: ${result.count} ${result.count === 1 ? "item" : "items"} from Phase ${result.from} → Phase ${result.to}`);
    },
    set(request) {
      const result = planSet(spec, request, loadNodes(projectDir));
      if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
      if (result.kind === "unchanged") return { kind: "unchanged", line: result.reason };
      applyEdits(result.plan);
      return landed(`set: phase ${result.phaseId} · ${result.said.join(" · ")}`);
    },
    task(request) {
      const result = planTask(spec, request, loadNodes(projectDir));
      if (result.kind === "invalid") return { kind: "invalid", reason: result.reason };
      applyEdits(result.plan);
      return landed(result.line);
    },
    note(request) {
      const result = planNote(spec, request);
      if (result.plan.kind === "invalid") return { kind: "invalid", reason: result.plan.reason };
      if (result.plan.kind === "unchanged") return { kind: "unchanged", line: result.plan.reason };
      applyEdits(result.plan);
      const removed = (result.plan.removes ?? []).length > 0;
      return landed(`note: phase ${result.phaseId} · ${result.file} ${removed ? "removed" : "written"}${removed ? "" : "; commit it with the hand-off"}`);
    },
  };
}

function landed(line: string): PhaseOutcome {
  return { kind: "landed", line };
}

function splitLine(result: Exclude<Split, { kind: "invalid" }>, refs: readonly string[]): string {
  const kept = result.original.id;
  const added = result.parts.map((part) => `${part.id} — ${part.title} → ${part.pointer}`).join(", ");
  const review = refs.length === 0 ? "" : `\nThese still point at Phase ${kept}; keep them, or retarget to a new part:\n${refs.map((ref) => `- ${ref}`).join("\n")}`;
  return `split Phase ${kept}: kept ${kept}, added ${added}${review}`;
}
