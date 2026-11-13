import { samePerson } from "../core/people";
import { disc, due, esc, pri, sessionChip, since, strip } from "./marks";
import type { NeedRow, PageCard, PageModel, PageQuestion } from "./model";
import { personOf } from "./people";

const NEEDS_SHOWN = 3;

export function nowView(model: PageModel, now: Date): string {
  return [needsBlock(model, now), sessionsLane(model, now), movingLane(model, now), finishedToday(model, now)].join("");
}

function needsBlock(model: PageModel, now: Date): string {
  const rows = model.needs.rows.toSorted((a, b) => Number(isOthers(a, model)) - Number(isOthers(b, model)));
  const shown = rows.slice(0, NEEDS_SHOWN).map((row) => needRow(model, row, now)).join("");
  const rest = rows.slice(NEEDS_SHOWN);
  const more = rest.length > 0 ? `<details class="folded" data-id="needs-more"><summary class="fold">${rest.length} more<i class="chev"></i></summary><div class="rows">${rest.map((row) => needRow(model, row, now)).join("")}</div></details>` : "";
  const empty = rows.length === 0 ? `<p class="empty">Nothing waits on anyone.</p>` : "";
  return `<div class="needs"><div class="count"><b>${model.needs.mine}</b><span>need you</span>${othersLine(model)}</div><div class="rows">${shown}${more}${empty}</div></div>`;
}

function isOthers(row: NeedRow, model: PageModel): boolean {
  return row.owner !== undefined && model.me !== undefined && !samePerson(row.owner, model.me) && row.owner !== model.me;
}

function othersLine(model: PageModel): string {
  const parts = model.needs.others.map(({ person, count }) => `${disc(model.people, { person, writing: false }, true)}${esc(personOf(model.people, person)?.name ?? person)} ${count}`);
  return parts.length > 0 ? `<small>${parts.join(" ")}</small>` : "";
}

export function needRow(model: PageModel, row: NeedRow, now: Date): string {
  const late = row.late ? " late" : "";
  const link = row.card ? ` <a href="#${esc(row.card)}">${esc(row.card)}</a>` : "";
  const age = isOthers(row, model) && row.owner ? `<span class="age">${disc(model.people, { person: row.owner, writing: false }, true)}${esc(row.owner)}</span>` : row.since ? `<span class="age">${since(row.since, now)}</span>` : "";
  return `<div class="ny${late}" data-id="${esc(row.question?.id ?? row.card ?? `${row.kind}:${row.spec ?? ""}`)}" data-kind="${row.kind}"><span class="k">${row.mark}</span><span class="t">${esc(row.title)}<span>${esc(row.detail)}${link}</span></span>${row.question ? answerForm(row.question) : ""}${age}</div>`;
}

export function answerForm(question: PageQuestion): string {
  const pick = question.recommend ? `<button class="btn pick" type="submit" value="${esc(question.recommend)}" title="recommended">${esc(question.recommend)}</button>` : "";
  return `<form class="acts answer" data-spec="${esc(question.spec)}" data-question="${esc(question.id)}" data-version="${esc(question.version)}">${pick}<input name="own" placeholder="${question.recommend ? "or your words" : "your answer"}" aria-label="Your answer to ${esc(question.id)}"><button class="btn" type="submit" value="">Answer</button><span class="said" aria-live="polite"></span></form>`;
}

function sessionsLane(model: PageModel, now: Date): string {
  const chips = model.sessions.map((session) => sessionChip(model.people, session, now)).join("");
  return `<div class="lane"><div class="h">Sessions <span class="more">${model.sessions.length} in the last day</span></div><div class="fleet">${chips || `<p class="empty">No session wrote to the board today.</p>`}</div></div>`;
}

function movingLane(model: PageModel, now: Date): string {
  const cards = model.moving.flatMap((id) => model.cards.find((card) => card.id === id) ?? []);
  const tags = [...new Set(cards.flatMap((card) => card.tags))];
  const chips = [`<button class="chip on" type="button" data-filter="">All</button>`, ...tags.map((tag) => `<button class="chip" type="button" data-filter="${esc(tag)}">${esc(tag)}</button>`)].join("");
  const rows = cards.map((card) => cardRow(model, card, now)).join("");
  return `<div class="lane"><div class="h">Moving <span class="more">${cards.length}</span></div>${tags.length > 1 ? `<div class="chips">${chips}</div>` : ""}<div class="slab" id="moving">${rows || `<p class="empty">Nothing is moving.</p>`}</div></div>`;
}

export function cardRow(model: PageModel, card: PageCard, now: Date): string {
  const latest = card.sessions[0];
  const age = latest ? (latest.state === "writing" ? `<span class="age2 now">now</span>` : `<span class="age2">${since(latest.lastWriteAt, now)}</span>`) : `<span class="age2"></span>`;
  const dueChip = card.due.kind === "none" ? "" : due(card.due, true);
  const sub = `<span class="sub">${esc(card.tags.join(", "))}${dueChip}</span>`;
  const p0 = card.priority === "p0" ? " p0" : "";
  return `<a class="row" href="#${esc(card.id)}" data-id="${esc(card.id)}" data-kind="card" data-stage="${card.stage}" data-tags="${esc(card.tags.join("|"))}">${pri(card.priority)}<span class="title${p0}"><b>${esc(card.title)}</b>${sub}</span>${strip(card.phases)}${disc(model.people, card.who[0])}${age}</a>`;
}

function finishedToday(model: PageModel, now: Date): string {
  const cards = model.finishedToday.flatMap((id) => model.cards.find((card) => card.id === id) ?? []);
  if (cards.length === 0) return "";
  return `<details class="folded" data-id="finished-today"><summary class="fold"><i class="sq live"></i>Finished today (${cards.length})<i class="chev"></i></summary><div class="slab">${cards.map((card) => cardRow(model, card, now)).join("")}</div></details>`;
}
