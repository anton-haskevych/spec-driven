import { applyEdits } from "../../core/apply-edits";
import { isoTimestamp } from "../../core/schedule";
import { resolveSpec } from "../../core/spec-folders";
import { planPark, planUnpark } from "../../phases/park";
import type { LocalPilot } from "../../runtime/workflow-capabilities";
import { parseFlags } from "./args";

export const PARK_USAGE = 'phase park <spec> <phase> "<question>" [--recommend "<answer>"]';
export const UNPARK_USAGE = 'phase unpark <spec> <phase> "<answer>"';

export function phasePark(projectDir: string, args: readonly string[], workflow?: LocalPilot): string {
  const parsed = parseFlags(args, { recommend: { type: "string" } });
  const [specName, phase, question] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !question?.trim()) return `usage: ${PARK_USAGE}`;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase park: ${spec}`;
  const recommend = parsed.values.recommend;
  const result = planPark(spec, { phase, question, recommend, at: isoTimestamp(new Date()) });
  if (result.plan.kind !== "ok") return `phase park: ${result.plan.reason}`;
  applyEdits(result.plan);
  const advice = recommend?.trim() ? ` · recommend: ${recommend.trim()}` : "";
  const followup = workflow ? "Commit the note locally, then hand off." : "Commit and push the note, then hand off.";
  return `parked Phase ${result.phaseId} in ${result.file}: "${question.trim()}"${advice}\n${followup}`;
}

export function phaseUnpark(projectDir: string, args: readonly string[]): string {
  const parsed = parseFlags(args, {});
  const [specName, phase, answer] = parsed?.positionals ?? [];
  if (!parsed || !specName || !phase || !answer?.trim()) return `usage: ${UNPARK_USAGE}`;

  const spec = resolveSpec(projectDir, specName);
  if (typeof spec === "string") return `phase unpark: ${spec}`;
  const result = planUnpark(spec, { phase, answer, at: isoTimestamp(new Date()) });
  if (result.plan.kind !== "ok") return `phase unpark: ${result.plan.reason}`;
  applyEdits(result.plan);
  return `answered Phase ${result.phaseId}: "${answer.trim()}"`;
}
