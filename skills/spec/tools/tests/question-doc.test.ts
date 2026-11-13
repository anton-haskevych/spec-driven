import { describe, expect, test } from "bun:test";
import { validateRecordDoc } from "../plan/kinds";
import { aboutOf, aboutPhase, nextQuestionId, readQuestionDoc } from "../questions/question-doc";
import { readSpecQuestions } from "../questions/read";
import { viewOf } from "./fake-record";
import { questionDoc } from "./record-factories";

describe("readQuestionDoc", () => {
  test("an open and an answered question read back as written", () => {
    const open = questionDoc({ recommend: "no reset" });
    const answered = questionDoc({ id: "q2", answer: { text: "No, keep it", by: "Anton", at: "2026-11-13T10:00:00-08:00" } });
    expect(readQuestionDoc(JSON.parse(JSON.stringify(open)))).toEqual({ doc: open, problems: [] });
    expect(readQuestionDoc(answered)).toEqual({ doc: answered, problems: [] });
  });

  test("every bad field is named", () => {
    expect(readQuestionDoc({ id: "12", about: "checkout", kind: "poll", askedAt: "", question: 4, answer: { text: "yes" } }).problems).toEqual([
      'id must look like q<n>, not "12"',
      'about must be <spec>#<phase>, <spec>#<phase>:<task> or card:<id>, not "checkout"',
      'kind must be question or gate, not "poll"',
      "askedAt must be text",
      "askedBy must be text",
      "question must be text",
      "answer: by must be text",
      "answer: at must be text",
    ]);
  });

  test("a gate question names its task", () => {
    expect(readQuestionDoc(questionDoc({ kind: "gate", about: "checkout#2" })).problems).toEqual(["a gate question is about a task: <spec>#<phase>:<task>"]);
  });
});

describe("about", () => {
  test("names a phase or a task of one", () => {
    expect(aboutPhase("checkout", "2")).toBe("checkout#2");
    expect(aboutPhase("checkout", "2", "2.4")).toBe("checkout#2:2.4");
    expect(aboutOf("checkout#2:2.4")).toEqual({ spec: "checkout", phase: "2", task: "2.4" });
    expect(aboutOf("checkout#2a")).toEqual({ spec: "checkout", phase: "2a" });
    expect(aboutOf("card:c96")).toBeUndefined();
  });
});

describe("question ids", () => {
  test("the next id is past every number in the folder", () => {
    expect(nextQuestionId([])).toBe("q1");
    expect(nextQuestionId([questionDoc({ id: "q1" }), questionDoc({ id: "q9" }), questionDoc({ id: "q3" })])).toBe("q10");
  });
});

describe("questions on the record", () => {
  test("a spec's questions read in number order; another spec's and unreadable ones are left out", () => {
    const view = viewOf({
      "specs/checkout/questions/q10.json": questionDoc({ id: "q10" }),
      "specs/checkout/questions/q2.json": questionDoc({ id: "q2" }),
      "specs/checkout/questions/q3.json": { id: "q3" },
      "specs/other/questions/q1.json": questionDoc({ id: "q1", about: "other#1" }),
    });
    expect(readSpecQuestions(view, "checkout").map((doc) => doc.id)).toEqual(["q2", "q10"]);
  });

  test("the store validates a question at its path", () => {
    expect(validateRecordDoc("specs/checkout/questions/q1.json", questionDoc())).toEqual([]);
    expect(validateRecordDoc("specs/checkout/questions/q2.json", questionDoc())).toEqual(["specs/checkout/questions/q2.json: id q1 does not match the path"]);
  });
});
