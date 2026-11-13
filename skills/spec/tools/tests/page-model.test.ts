import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { buildPageModel } from "../page/model";
import { dueWord } from "../page/due";
import { boardInputs } from "./board-factories";
import { cardDocPath } from "../cards/paths";
import { PAGE_NOW, pageDocs, pageInputs, pageModel } from "./page-fixture";
import { cardDoc } from "./record-factories";

describe("the page model", () => {
  const model = pageModel();
  const card = (id: string) => model.cards.find((each) => each.id === id);

  test("a card in full: covering phases with squares and titles, origin quote, waiting question, copy line", () => {
    expect(card("c90")).toMatchObject({
      stage: "moving",
      phases: [
        { spec: "schedule-fixes", id: "2", title: "Filter labels", stage: "doing", square: "doing" },
        { spec: "schedule-fixes", id: "3", title: "Teachers pick", stage: "todo", square: "todo" },
      ],
      origin: { quote: "I like having the Upcoming Events … now it doesn't show.", person: "Chasity", app: "imessage" },
      otherSources: 1,
      question: { id: "q12", phase: "3", recommend: "No reset" },
      who: [{ person: "Anton", writing: true }],
    });
    expect(card("c90")?.question?.version).toMatch(/^[0-9a-f]{40}$/);
    expect(card("c90")?.copy).toBe('Card c90 "Filters say what they hide" (Schedule fixes, p0), open, covered by schedule-fixes#2-3, waits on question q12 (schedule-fixes). Tell me where it stands and what is next.');
  });

  test("a merged phase is live, a done card is done and finished today, a dropped card counts nowhere", () => {
    expect(card("c92")).toMatchObject({ stage: "done", phases: [{ id: "1", stage: "merged", square: "live" }] });
    expect(model.finishedToday).toEqual(["c92"]);
    expect(model.moving).toEqual(["c90"]);
    expect(model.totals).toEqual({ done: 1, all: 4 });
  });

  test("a card covering a whole spec says so; a spec it also names by phase is still whole", () => {
    const docs = { ...pageDocs(), [cardDocPath("c96")]: cardDoc({ id: "c96", title: "All of it", status: "doing", coveredBy: ["schedule-fixes", "schedule-fixes#2"] }) };
    const whole = pageModel(pageInputs(docs)).cards.find((each) => each.id === "c96");
    expect(whole).toMatchObject({ whole: ["schedule-fixes"] });
    expect(whole?.phases.map((phase) => phase.id)).toEqual(["1", "2", "3"]);
    expect(card("c90")?.whole).toEqual([]);
  });

  test("an ended card carries how it ended and its note; it has no deadline", () => {
    expect(card("c92")).toMatchObject({ closed: { at: "2026-11-13T09:00:00-08:00", by: "Anton", why: "merged" }, note: "Spec: schedule-fixes | Items: featured row", due: { kind: "none" } });
    expect(card("c94")).toMatchObject({ status: "dropped", closed: { at: "2026-11-10", by: "Anton", why: "no" } });
  });

  test("needs you: the record's question with its id and version first, then the board's rows in its own words", () => {
    expect(model.needs.rows[0]).toMatchObject({ kind: "question", mark: "Q", title: "Reset the Teachers pick each morning?", detail: "schedule-fixes · phase 3", owner: "Anton", question: { id: "q12" } });
    expect(model.needs.rows.filter((row) => row.kind === "question")).toHaveLength(1);
    const docs = { ...pageDocs(), [cardDocPath("c95")]: cardDoc({ id: "c95", title: "Keep events visible", coveredBy: ["schedule-fixes#1"], assignee: "Taras" }) };
    expect(pageModel(pageInputs(docs)).needs.rows[1]).toEqual({ kind: "card-close", mark: "C", title: "Card c95 can close: schedule-fixes#1 merged", detail: "Keep events visible → say what the customer was told", late: false, owner: "Taras", card: "c95" });
  });

  test("the viewer's count, and the other person's beside it", () => {
    const taras = pageModel(undefined, "Taras");
    expect(taras.needs.others).toContainEqual({ person: "Anton", count: 1 });
    expect(model.needs.mine).toBe(model.needs.rows.length);
  });

  test("one person spelled several ways is one count, matched as owners are", () => {
    const close = (id: string, assignee: string) => cardDoc({ id, title: id, coveredBy: ["schedule-fixes#1"], assignee });
    const docs = { ...pageDocs(), [cardDocPath("c95")]: close("c95", "Taras"), [cardDocPath("c96")]: close("c96", "Taras Korpach"), [cardDocPath("c97")]: close("c97", "taras") };
    expect(pageModel(pageInputs(docs)).needs.others).toEqual([{ person: "Taras", count: 3 }]);
  });

  test("sessions: writing now, and quiet with unpushed commits reads silent", () => {
    expect(model.sessions).toMatchObject([
      { person: "Anton", spec: "schedule-fixes", state: "writing" },
      { person: "Taras", spec: "import", state: "silent", unsaved: { ahead: 3, edited: 0 } },
    ]);
    expect(model.people.map((person) => [person.name, person.hue])).toEqual([["Anton", 0], ["Taras", 1]]);
  });

  test("Plan: a row per tag, P0 first, with its reason, counts, panels per covering spec, Open and Done", () => {
    expect(model.plan.map((row) => row.tag)).toEqual(["Schedule fixes", "Card fee", "No tag"]);
    expect(model.plan[0]).toMatchObject({
      priority: "p0",
      reason: "Students can't find their classes",
      counts: { done: 1, moving: 1, todo: 1 },
      due: { kind: "late", text: "overdue Nov 12" },
      waits: 1,
      unfolded: true,
      closed: false,
      panels: [{ spec: "schedule-fixes", session: { person: "Anton" }, cards: ["c90"] }],
      open: ["c91"],
      done: ["c92"],
    });
    expect(model.plan[1]).toMatchObject({ tag: "Card fee", counts: { done: 0, moving: 0, todo: 0 }, unfolded: false, closed: false });
    expect(model.plan[2]).toMatchObject({ tag: "No tag", untagged: true, open: ["c93"], who: [{ person: "Taras", writing: false }] });
  });

  test("the board rides along untouched", () => {
    expect(model.board.version).toBe(3);
    expect(model.tip).toBe("t1");
    expect(model.notice).toBeUndefined();
  });
});

test("with no record the page says why it is empty", () => {
  const inputs = boardInputs([]);
  const empty = buildPageModel(inputs, buildBoard(inputs, PAGE_NOW), { people: [], now: PAGE_NOW });
  expect(empty.notice).toStartWith("The board is off here");
  expect(empty.cards).toEqual([]);
  expect(empty.plan).toEqual([]);
});

test("deadline words", () => {
  expect(dueWord(undefined, PAGE_NOW)).toEqual({ kind: "none", text: "no deadline yet" });
  expect(dueWord("2026-11-12", PAGE_NOW)).toMatchObject({ kind: "late", text: "overdue Nov 12" });
  expect(dueWord("2026-11-13", PAGE_NOW)).toMatchObject({ kind: "soon", text: "today" });
  expect(dueWord("2026-11-14", PAGE_NOW)).toMatchObject({ kind: "soon", text: "tomorrow" });
  expect(dueWord("2026-11-17", PAGE_NOW)).toMatchObject({ kind: "date", text: "Nov 17" });
});
