import { describe, expect, test } from "bun:test";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { phaseDocPath, questionDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import { tickPlan, type TickIntent } from "../plan/ops/tick";
import { readJoinedPlan } from "../plan/state-source";
import { approvalEvidence, approvalOf } from "../questions/gate";
import type { QuestionDoc } from "../questions/question-doc";
import { planWrites } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import { viewOf, viewOfTexts } from "./fake-record";
import { phaseDoc, questionDoc, specDoc, task } from "./record-factories";

const SPEC = "checkout";
const GATE: PhaseDoc = phaseDoc({ id: "4", gate: "design", tasks: [task({ id: "4.1", text: "Gate: design agreed with Anton", gate: true }), task({ id: "4.2" })] });
const TICK: TickIntent = { spec: SPEC, phase: "4", task: "4.1", evidence: "Anton approved in chat, 2026-11-13", at: "T5", tree: "pr-a", session: "s1" };
const APPROVAL = { text: "Anton approved in chat, 2026-11-13", by: "Anton", at: "T5" };

function record(questions: QuestionDoc[] = []): RecordView {
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ phases: ["4"] }),
    [phaseDocPath(SPEC, "4")]: GATE,
    ...Object.fromEntries(questions.map((doc) => [questionDocPath(SPEC, doc.id), doc])),
  });
}

function after(view: RecordView, intent: TickIntent) {
  const result = tickPlan(intent)(view);
  if (!("ops" in result)) throw new Error(JSON.stringify(result));
  const written = planWrites(view, result.ops, validateRecordDoc);
  if (written.kind !== "planned") throw new Error(JSON.stringify(written));
  const texts = new Map(view.paths().map((path) => [path, JSON.stringify(view.doc(path))]));
  for (const change of written.changes) if (change.text !== undefined) texts.set(change.path, change.text);
  return readJoinedPlan(viewOfTexts(texts, view.tip), SPEC);
}

describe("a Gate: approval on the board", () => {
  test("a gate ticked with evidence records its approval as an answered gate question in the same write", () => {
    const plan = after(record(), { ...TICK, approval: APPROVAL });
    expect(plan?.phases[0]?.tasks[0]).toMatchObject({ done: true, evidence: APPROVAL.text });
    expect(plan?.questions).toEqual([{ id: "q1", about: "checkout#4:4.1", kind: "gate", askedAt: "T5", askedBy: "Anton", question: "Gate: design agreed with Anton", answer: APPROVAL }]);
  });

  test("an open gate question about the task is the one answered", () => {
    const open = questionDoc({ id: "q3", about: "checkout#4:4.1", kind: "gate", question: "Design ok?" });
    expect(after(record([open]), { ...TICK, approval: APPROVAL })?.questions).toEqual([{ ...open, answer: APPROVAL }]);
  });

  test("an approval already answered stays as it is", () => {
    const answered = questionDoc({ id: "q3", about: "checkout#4:4.1", kind: "gate", answer: { text: "yes", by: "Taras", at: "T1" } });
    expect(after(record([answered]), { ...TICK, approval: APPROVAL })?.questions).toEqual([answered]);
  });

  test("the answered gate question is the tick's evidence", () => {
    const plan = readJoinedPlan(record([questionDoc({ id: "q3", about: "checkout#4:4.1", kind: "gate", answer: { text: "go ahead", by: "Anton", at: "2026-11-13T09:00:00-08:00" } })]), SPEC);
    const approval = plan ? approvalOf(plan, "4", "4.1") : undefined;
    expect(approval && approvalEvidence(approval)).toBe('"go ahead" — Anton, 2026-11-13T09:00:00-08:00');
    expect(plan && approvalOf({ ...plan, questions: [] }, "4", "4.1")).toBeUndefined();
  });
});
