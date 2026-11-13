import { describe, expect, test } from "bun:test";
import type { PhaseDoc } from "../plan/docs/phase-doc";
import { phaseDocPath, questionDocPath, specDocPath, validateRecordDoc } from "../plan/kinds";
import type { ChangeSeen } from "../plan/ops/change";
import { readJoinedPlan } from "../plan/state-source";
import type { QuestionDoc } from "../questions/question-doc";
import { answerPlan, askPlan } from "../questions/plans";
import { planWrites } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import type { RecordPlan } from "../record/write";
import { viewOf, viewOfTexts } from "./fake-record";
import { phaseDoc, questionDoc, specDoc, task } from "./record-factories";

const SPEC = "checkout";
const ASK = { spec: SPEC, phase: "3", question: "Reset  the pick\neach morning?", recommend: "no reset", at: "T1", by: "session-1" };
const ANSWER = { spec: SPEC, text: "No, keep it", by: "Anton", at: "T2" };

function record(questions: QuestionDoc[] = [], phases: PhaseDoc[] = defaultPhases()): RecordView {
  return viewOf({
    [specDocPath(SPEC)]: specDoc({ phases: phases.map((phase) => phase.id), planVersion: 4 }),
    ...Object.fromEntries(phases.map((phase) => [phaseDocPath(SPEC, phase.id), phase])),
    ...Object.fromEntries(questions.map((doc) => [questionDocPath(SPEC, doc.id), doc])),
  });
}

function defaultPhases(): PhaseDoc[] {
  return [
    phaseDoc({ id: "2", tasks: [task({ id: "2.1", done: true })] }),
    phaseDoc({ id: "3", tasks: [task({ id: "3.1", done: true }), task({ id: "3.2", text: "build it" })] }),
    phaseDoc({ id: "4", gate: "design", tasks: [task({ id: "4.1", text: "Gate: design agreed with Anton", gate: true }), task({ id: "4.2" })] }),
  ];
}

function run(plan: (see: (seen: ChangeSeen) => void) => RecordPlan, view = record()) {
  const seen: ChangeSeen[] = [];
  const result = plan((each) => seen.push(each))(view);
  if (!("ops" in result)) return { result, seen, questions: undefined };
  const written = planWrites(view, result.ops, validateRecordDoc);
  if (written.kind !== "planned") return { result, seen, written, questions: undefined };
  const texts = new Map(view.paths().map((path) => [path, JSON.stringify(view.doc(path))]));
  for (const change of written.changes) if (change.text !== undefined) texts.set(change.path, change.text);
  return { result, seen, questions: readJoinedPlan(viewOfTexts(texts, view.tip), SPEC)?.questions };
}

describe("askPlan", () => {
  test("a phase's question gets the next id, in one line, and nothing else changes", () => {
    const { questions, seen, result } = run((see) => askPlan(ASK, see), record([questionDoc({ id: "q4", about: "checkout#2", answer: { text: "x", by: "Anton", at: "T0" } })]));
    expect(questions?.at(-1)).toEqual({ id: "q5", about: "checkout#3", kind: "question", askedAt: "T1", askedBy: "session-1", question: "Reset the pick each morning?", recommend: "no reset" });
    expect("ops" in result && result.ops.map((op) => op.path)).toEqual([questionDocPath(SPEC, "q5")]);
    expect(seen[0]?.line).toBe('question: q5 open on phase 3 — "Reset the pick each morning?" · recommend: no reset\nHand off; the board shows the question.');
  });

  test("a phase whose next task is a Gate: item asks a gate question about that task", () => {
    const { questions } = run((see) => askPlan({ ...ASK, phase: "4", question: "Design ok?" }, see));
    expect(questions?.[0]).toMatchObject({ id: "q1", about: "checkout#4:4.1", kind: "gate" });
  });

  test("one open question per phase; the same question asked again changes nothing", () => {
    const view = record([questionDoc({ id: "q1", about: "checkout#3", question: "Reset the pick each morning?" })]);
    expect(run((see) => askPlan({ ...ASK, question: "Another?" }, see), view).result).toEqual({ refused: 'Phase 3 is already parked on "Reset the pick each morning?" (q1); ask both in one question' });
    const again = run((see) => askPlan(ASK, see), view);
    expect(again.result).toEqual({ unchanged: true });
    expect(again.seen[0]?.line).toBe("question: q1 is already open on phase 3");
  });

  test("a done phase or one parked before questions moved refuses", () => {
    expect(run((see) => askPlan({ ...ASK, phase: "2" }, see)).result).toEqual({ refused: "Phase 2 is done; nothing to park" });
    const parked = defaultPhases().map((phase) => (phase.id === "3" ? { ...phase, parks: [{ parkedAt: "T0", question: "Old?" }] } : phase));
    expect(run((see) => askPlan(ASK, see), record([], parked)).result).toEqual({ refused: 'Phase 3 is already parked on "Old?"; ask both in one question' });
  });
});

describe("answerPlan", () => {
  const open = questionDoc({ id: "q2", about: "checkout#3" });

  test("answers by id or by the phase's open question, as a quote with who and when", () => {
    for (const target of [{ id: "q2" }, { phase: "3" }]) {
      const { questions, seen } = run((see) => answerPlan({ ...ANSWER, ...target }, see), record([open]));
      expect(questions?.[0]?.answer).toEqual({ text: "No, keep it", by: "Anton", at: "T2" });
      expect(seen[0]?.line).toBe('question: q2 answered on phase 3: "No, keep it" (Anton)');
    }
  });

  test("carries the version it read: a question changed since is a conflict", () => {
    const { written } = run((see) => answerPlan({ ...ANSWER, id: "q2", ifVersion: "stale" }, see), record([open]));
    expect(written?.kind).toBe("conflict");
  });

  test("an answered question refuses another answer and repeats its own", () => {
    const answered = record([{ ...open, answer: { text: "Yes", by: "Taras", at: "T1" } }]);
    expect(run((see) => answerPlan({ ...ANSWER, id: "q2" }, see), answered).result).toEqual({ refused: 'q2 was answered T1 by Taras: "Yes"' });
    expect(run((see) => answerPlan({ ...ANSWER, id: "q2", text: "Yes" }, see), answered).result).toEqual({ unchanged: true });
  });

  test("nothing to answer is named", () => {
    expect(run((see) => answerPlan({ ...ANSWER, phase: "3" }, see)).result).toEqual({ refused: "Phase 3 is not parked" });
    expect(run((see) => answerPlan({ ...ANSWER, id: "q9" }, see)).result).toEqual({ refused: "no question q9 in checkout" });
  });
});
