import { describe, expect, test } from "bun:test";
import { buildBoard } from "../board/lanes";
import { cardDocPath } from "../cards/paths";
import { buildPageModel } from "../page/model";
import { renderApp, renderPage } from "../page/render";
import { STYLES } from "../page/styles";
import { boardInputs } from "./board-factories";
import { PAGE_NOW, pageDocs, pageInputs, pageModel } from "./page-fixture";
import { cardDoc } from "./record-factories";

describe("the rendered page", () => {
  const model = pageModel();
  const html = renderPage(model);

  test("is one document with the needs-you count in its title", () => {
    expect(html).toStartWith("<!doctype html>");
    expect(html).toContain(`<title>(${model.needs.mine}) Live board · crm</title>`);
    expect(html).toContain(`<a class="nav" href="#now" data-nav="now">Now<i>${model.needs.mine}</i></a>`);
  });

  test("Now: the question row answers with the version the page showed", () => {
    const version = model.needs.rows[0]?.question?.version ?? "";
    expect(html).toContain(`<form class="acts answer" data-spec="schedule-fixes" data-question="q12" data-version="${version}"><button class="btn pick" type="submit" value="No reset" title="recommended">No reset</button>`);
  });

  test("a question row opens the card it is about", () => {
    expect(html).toContain(`<a class="t" href="#c90" title="Open c90">Reset the Teachers pick each morning?<span>schedule-fixes · phase 3</span></a>`);
  });

  test("rows carry data-id, data-kind and data-stage", () => {
    expect(html).toContain(`<a class="row" href="#c90" data-id="c90" data-kind="card" data-stage="moving" data-tags="Schedule fixes">`);
    expect(html).toContain(`data-id="tag:Schedule fixes" data-kind="project" data-rank="1"`);
  });

  test("sessions: writing now, and a silent one with what it hasn't pushed", () => {
    expect(html).toContain(`<b>schedule fixes</b><span class="now">now</span>`);
    expect(html).toMatch(/<span class="sess silent"[^>]*><span class="who h1 sm"[^>]*>T<\/span><b>import<\/b>47m · 3 commits not pushed<\/span>/);
  });

  test("Plan: P0 first with its reason, an overdue row starts open, Done folded with a count", () => {
    expect(html).toContain(`<div class="gh" data-rank="0">P0 <span class="more">1 project</span></div>`);
    expect(html).toMatch(/<details class="proj p0" [^>]*data-due="2026-11-12"[^>]* open><summary><span class="pri p0">P0<\/span><span class="pn"><b>Schedule fixes<\/b><span class="waits">1 waits on an answer<\/span>/);
    expect(html).toContain(`<span class="due late">overdue Nov 12</span>`);
    expect(html).toContain(`<summary class="ph"><b><i class="sq live"></i>Done</b><span class="n">1<i class="chev"></i></span></summary>`);
  });

  test("an opened card: the quote, the phases with their names, the copy line", () => {
    expect(html).toContain(`<section class="sheet" id="c90" data-view="card" data-id="c90" data-kind="card" data-stage="moving" hidden>`);
    expect(html).toContain(`<blockquote>“I like having the Upcoming Events … now it doesn&#x27;t show.”<footer><span>Chasity · imessage · Nov 11</span><span>1 more source</span></footer></blockquote>`);
    expect(html).toContain(`<div class="phase"><i class="sq doing"></i><span>2 · Filter labels</span><span class="st doing">doing</span></div>`);
    expect(html).toContain(`<span class="waits">waits on q12</span>`);
    expect(html).toContain(`data-copy="Card c90 &quot;Filters say what they hide&quot;`);
  });

  test("words from the record are escaped", () => {
    const docs = { ...pageDocs(), [cardDocPath("c99")]: cardDoc({ id: "c99", title: `<img src=x onerror="alert(1)">`, status: "doing" }) };
    const page = renderPage(pageModel(pageInputs(docs)));
    expect(page).not.toContain("<img src=x");
    expect(page).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  test("the pushed render is the app part and the title", () => {
    const app = renderApp(model);
    expect(app.title).toBe(`(${model.needs.mine}) Live board · crm`);
    expect(html).toContain(app.html);
    expect(app.html).not.toContain("<script");
  });
});

test("with no record: an honest empty page", () => {
  const inputs = boardInputs([]);
  const html = renderPage(buildPageModel(inputs, buildBoard(inputs, PAGE_NOW), { people: [], now: PAGE_NOW }));
  expect(html).toContain(`<div class="notice">The board is off here`);
  expect(html).toContain("Nothing waits on anyone.");
  expect(html).toContain("No projects yet");
  expect(html).toContain("<title>Live board · crm</title>");
});

test("every style block is closed, so no rule hides inside a phone-only query", () => {
  const css = STYLES.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let lowest = 0;
  for (const char of css) {
    depth += char === "{" ? 1 : char === "}" ? -1 : 0;
    lowest = Math.min(lowest, depth);
  }
  expect({ depth, lowest }).toEqual({ depth: 0, lowest: 0 });
});

test("only a question on the record gets answer buttons: a park in files has nothing to save to", () => {
  const model = pageModel();
  const park = { kind: "question" as const, mark: "Q" as const, title: "Ship it Friday?", detail: "checkout · phase 2", late: false, spec: "checkout" };
  const html = renderApp({ ...model, needs: { ...model.needs, rows: [park] } }).html;
  expect(html).toContain("Ship it Friday?");
  expect(html.split('data-view="plan"')[0]).not.toContain("<form");
});
