import { samePerson } from "../core/people";
import { PRIORITIES } from "../core/schedule";
import { coverStrip, disc, discs, due, esc, pbar, pcount, pri, sessionChip, waits } from "./marks";
import type { PageCard, PageModel, PlanRow, SpecPanel } from "./model";

const SORT_CHIPS = `<span class="grp"><span class="more">Sort</span><button class="chip on" type="button" data-sort="rank">Priority</button><button class="chip" type="button" data-sort="due">Deadline</button></span>`;
const SHOW_CHIPS = `<span class="grp"><span class="more">Show</span><button class="chip on" type="button" data-show="">Everyone</button><button class="chip" type="button" data-show="mine">Mine</button><button class="chip" type="button" data-show="nobody">Nobody has it</button></span>`;

export function planView(model: PageModel, now: Date): string {
  const open = model.plan.filter((row) => !row.closed);
  const closed = model.plan.filter((row) => row.closed);
  let rank = 0;
  const groups = [...PRIORITIES, undefined].flatMap((priority) => {
    const rows = open.filter((row) => row.priority === priority);
    if (rows.length === 0) return [];
    return [`<div class="gh" data-rank="${rank++}">${priority ? priority.toUpperCase() : "No priority"} <span class="more">${rows.length} ${rows.length === 1 ? "project" : "projects"}</span></div>`, ...rows.map((row) => planRow(model, row, rank++, now))];
  });
  const closedFold = closed.length > 0 ? `<details class="folded" data-id="closed-projects" data-rank="${rank}"><summary class="fold">Closed · ${closed.length}<i class="chev"></i></summary><div class="plan">${closed.map((row) => planRow(model, row, rank, now)).join("")}</div></details>` : "";
  const body = groups.length + closed.length > 0 ? groups.join("") + closedFold : `<p class="empty">No projects yet: a project is a tag on a card.</p>`;
  return `<div class="chips">${SORT_CHIPS}${SHOW_CHIPS}</div><div class="plan" id="plan">${body}</div>`;
}

function planRow(model: PageModel, row: PlanRow, rank: number, now: Date): string {
  const p0 = row.priority === "p0" ? " p0" : "";
  const mine = model.me !== undefined && row.who.some((who) => samePerson(who.person, model.me ?? "") || who.person === model.me);
  const subtitle = row.waits > 0 ? waits(`${row.waits} ${row.waits === 1 ? "waits" : "wait"} on an answer`) : row.reason ? `<span class="reason" title="${esc(row.reason)}">${esc(row.reason)}</span>` : "";
  const attrs = `data-id="tag:${esc(row.tag)}" data-kind="project" data-rank="${rank}" data-due="${row.due.day ?? "9999"}" data-mine="${mine ? 1 : 0}" data-nobody="${row.who.length === 0 ? 1 : 0}"`;
  const summary = `<summary>${pri(row.priority)}<span class="pn"><b>${esc(row.tag)}</b>${subtitle}</span><span class="pprog">${pbar(row.counts)}${pcount(row.counts)}</span><span class="whos">${discs(model.people, row.who)}</span><span class="pdue">${due(row.due)}</span><i class="chev"></i></summary>`;
  return `<details class="proj${p0}" ${attrs}${row.unfolded ? " open" : ""}>${summary}<div class="panels">${panels(model, row, now)}</div></details>`;
}

function panels(model: PageModel, row: PlanRow, now: Date): string {
  const card = (id: string) => model.cards.find((each) => each.id === id);
  const specs = row.panels.map((panel) => specPanel(model, panel, now)).join("");
  const openCards = row.open.flatMap((id) => card(id) ?? []);
  const nobody = `<span class="nobody">${disc(model.people, undefined, true)}nobody has these</span>`;
  const open = openCards.length > 0 ? `<div class="panel open"><div class="ph"><b>Open</b>${nobody}</div>${openCards.map((each) => panelCard(each, false)).join("")}</div>` : "";
  const doneCards = row.done.flatMap((id) => card(id) ?? []);
  const done = doneCards.length > 0 ? `<details class="panel done folded" data-id="done:${esc(row.tag)}"><summary class="ph"><b><i class="sq live"></i>Done</b><span class="n">${doneCards.length}<i class="chev"></i></span></summary>${doneCards.map((each) => panelCard(each, false)).join("")}</details>` : "";
  return specs + open + done;
}

function specPanel(model: PageModel, panel: SpecPanel, now: Date): string {
  const cards = panel.cards.flatMap((id) => model.cards.find((card) => card.id === id) ?? []);
  const session = panel.session ? sessionChip(model.people, panel.session, now, true) : `<span class="nobody">${disc(model.people, undefined, true)}no session</span>`;
  return `<div class="panel" data-id="spec:${esc(panel.spec)}" data-kind="spec"><div class="ph"><b>${esc(panel.spec)}</b>${session}</div>${cards.map((card) => panelCard(card, true)).join("")}</div>`;
}

function panelCard(card: PageCard, covered: boolean): string {
  const meta = [covered ? coverStrip(card) : "", card.due.kind === "none" && covered ? "" : due(card.due, true), card.question ? waits("waits on your answer") : ""].join("");
  return `<a class="pc" href="#${esc(card.id)}" data-id="${esc(card.id)}" data-kind="card" data-stage="${card.stage}"><b>${esc(card.title)}</b><span class="pmeta">${meta}</span></a>`;
}

