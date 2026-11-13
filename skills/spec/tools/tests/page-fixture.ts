import type { BoardInputs } from "../board/inputs";
import { buildBoard } from "../board/lanes";
import { cardDocPath, sourceDocPath, tagDocPath } from "../cards/paths";
import { phaseDocPath, questionDocPath, specDocPath } from "../plan/kinds";
import { planSourceOf } from "../plan/read-plans";
import { buildPageModel, type PageModel } from "../page/model";
import { boardInputs, specFixture } from "./board-factories";
import { phaseState, specMeta } from "./factories";
import { viewOf } from "./fake-record";
import { cardDoc, phaseDoc, prDoc, questionDoc, sessionDoc, sourceDoc, specDoc, tagDoc, task } from "./record-factories";

export const PAGE_NOW = new Date("2026-11-13T12:00:00-08:00");
const minutesAgo = (minutes: number) => new Date(PAGE_NOW.getTime() - minutes * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");

// One joined spec with a shipped, a started and an untouched phase; four cards over two tags; a waiting
// question; one session writing now and one gone quiet with unpushed commits. The shape of the Academy board.
export function pageDocs(): Record<string, unknown> {
  return {
    [specDocPath("schedule-fixes")]: specDoc({ name: "schedule-fixes", phases: ["1", "2", "3"], layout: 4 }),
    [phaseDocPath("schedule-fixes", "1")]: phaseDoc({ id: "1", title: "Featured row", pr: "A", tasks: [task({ id: "1.1", done: true, evidence: "abc on origin/feat/x" })] }),
    [phaseDocPath("schedule-fixes", "2")]: phaseDoc({ id: "2", title: "Filter labels", pr: "B", tasks: [task({ id: "2.1", done: true, evidence: "def on origin/feat/y" }), task({ id: "2.2" })] }),
    [phaseDocPath("schedule-fixes", "3")]: phaseDoc({ id: "3", title: "Teachers pick", pr: "B", needs: ["2"] }),
    [questionDocPath("schedule-fixes", "q12")]: questionDoc({ id: "q12", about: "schedule-fixes#3", question: "Reset the Teachers pick each morning?", recommend: "No reset" }),
    [tagDocPath("Schedule fixes")]: tagDoc({ name: "Schedule fixes", kind: "area", priority: "p0", summary: "Students can't find their classes" }),
    [tagDocPath("Card fee")]: tagDoc({ name: "Card fee", kind: "area", priority: "p1" }),
    [cardDocPath("c90")]: cardDoc({ id: "c90", title: "Filters say what they hide", priority: "p0", tags: ["Schedule fixes"], coveredBy: ["schedule-fixes#2-3"] }),
    [sourceDocPath("c90", "a")]: sourceDoc({ card: "c90", person: "Chasity", quote: "I like having the Upcoming Events … now it doesn't show." }),
    [sourceDocPath("c90", "b")]: sourceDoc({ card: "c90", role: "mention", person: "Chasity", quote: "Still missing" }),
    [cardDocPath("c91")]: cardDoc({ id: "c91", title: "Private lessons held until paid", priority: "p0", due: "2026-11-12", tags: ["Schedule fixes"] }),
    [cardDocPath("c92")]: cardDoc({ id: "c92", title: "Featured row keeps events visible", status: "done", tags: ["Schedule fixes"], coveredBy: ["schedule-fixes#1"], note: "Spec: schedule-fixes | Items: featured row", closed: { at: "2026-11-13T09:00:00-08:00", by: "Anton", why: "merged" } }),
    [cardDocPath("c93")]: cardDoc({ id: "c93", title: "Studio-wide events", assignee: "Taras" }),
    [cardDocPath("c94")]: cardDoc({ id: "c94", title: "Dropped idea", status: "dropped", tags: ["Schedule fixes"], closed: { at: "2026-11-10", by: "Anton", why: "no" } }),
  };
}

export function pageInputs(docs: Record<string, unknown> = pageDocs()): BoardInputs {
  const spec = specFixture("schedule-fixes", { meta: specMeta({ owner: "Anton" }), phases: [phaseState({ id: "1", done: true }), phaseState({ id: "2" }), phaseState({ id: "3" })] });
  return boardInputs([spec], {
    repo: "crm",
    plans: planSourceOf({ kind: "read", view: viewOf(docs), live: true }),
    prDocs: new Map([["schedule-fixes", [prDoc({ group: "A", state: "merged", branch: "feat/schedule-fixes-pr-a" }), prDoc({ group: "B", branch: "feat/schedule-fixes-pr-b" })]]]),
    sessionDocs: [
      sessionDoc({ ref: { source: { runtime: "claude", key: "claude-code" }, id: "s1" }, who: "Anton", host: "other", spec: "schedule-fixes", lastWriteAt: minutesAgo(1) }),
      sessionDoc({ ref: { source: { runtime: "claude", key: "claude-code" }, id: "s2" }, who: "Taras", host: "other", tree: "import-pr-a", spec: "import", lastWriteAt: minutesAgo(47), ahead: 3 }),
    ],
    thisHost: "mbp",
  });
}

export function pageModel(inputs: BoardInputs = pageInputs(), me = "Anton"): PageModel {
  return buildPageModel(inputs, buildBoard(inputs, PAGE_NOW, me), { people: ["Anton", "Taras"], now: PAGE_NOW });
}
