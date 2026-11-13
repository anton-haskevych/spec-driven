import { monthDay } from "./due";
import { disc, due, esc, pri, sessionChip, since, waits } from "./marks";
import type { PageCard, PageModel, PagePhase } from "./model";
import { answerForm } from "./render-now";

const STAGE_WORDS: Record<string, string> = { todo: "to do", open: "to do", doing: "doing", built: "built", merged: "live", deployed: "live", done: "done" };

export function cardSheet(model: PageModel, card: PageCard, now: Date): string {
  const dueChip = card.due.kind === "none" && card.closed ? "" : due(card.due);
  const head = `<div class="lane"><h4>${esc(card.title)}</h4>${ended(card)}<div class="kv">${pri(card.priority)}${card.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}<span class="tag${card.stage === "done" ? "" : " todo"}">${esc(card.commitment)}</span>${dueChip}</div></div>`;
  const note = card.note ? `<p class="note">${esc(card.note)}</p>` : "";
  const parts = [head, quote(card), note, question(card, now), ...coveredBy(card), sessions(model, card, now), copy(card)];
  return `<section class="sheet" id="${esc(card.id)}" data-view="card" data-id="${esc(card.id)}" data-kind="card" data-stage="${card.stage}" hidden>${parts.join("")}</section>`;
}

function ended(card: PageCard): string {
  if (!card.closed || (card.status !== "done" && card.status !== "dropped")) return "";
  const { at, by, why } = card.closed;
  return `<p class="end ${card.status}"><b>${card.status === "done" ? "Done" : "Dropped"}</b> ${esc(monthDay(at.slice(0, 10)))} by ${esc(by)}: ${esc(why)}</p>`;
}

function quote(card: PageCard): string {
  if (!card.origin) return "";
  const { origin } = card;
  const who = [origin.person, origin.app, monthDay(origin.at.slice(0, 10))].filter(Boolean).join(" · ");
  const more = card.otherSources > 0 ? `<span>${card.otherSources} more ${card.otherSources === 1 ? "source" : "sources"}</span>` : "";
  return `<blockquote>“${esc(origin.quote)}”<footer><span>${esc(who)}</span>${more}</footer></blockquote>`;
}

function question(card: PageCard, now: Date): string {
  const asked = card.question;
  if (!asked) return "";
  const advice = asked.recommend ? `recommended: ${asked.recommend}` : `${asked.spec}${asked.phase ? ` · phase ${asked.phase}` : ""}`;
  return `<div class="ny" data-id="${esc(asked.id)}" data-kind="question"><span class="k">Q</span><span class="t">${esc(asked.question)}<span>${esc(advice)}</span></span>${answerForm(asked)}<span class="age">${since(asked.askedAt, now)}</span></div>`;
}

function coveredBy(card: PageCard): string[] {
  if (card.covers.length === 0) return [`<div class="lane"><div class="h">Covered by nothing yet</div><p class="fine">No spec covers this card. Tell a session to prep one.</p></div>`];
  const specs = [...new Set(card.phases.map((phase) => phase.spec))];
  return specs.map((spec) => {
    const rows = card.phases.filter((phase) => phase.spec === spec).map((phase) => phaseLine(card, phase)).join("");
    return `<div class="lane"><div class="h">Covered by <code>${esc(spec)}</code></div><div class="phases">${rows}</div></div>`;
  });
}

function phaseLine(card: PageCard, phase: PagePhase): string {
  const square = `<i class="sq${phase.square === "todo" ? "" : ` ${phase.square}`}"></i>`;
  const waiting = card.question && card.question.spec === phase.spec && card.question.phase === phase.id;
  const status = waiting ? waits(`waits on ${card.question?.id}`) : `<span class="st ${phase.square}">${esc(STAGE_WORDS[phase.stage] ?? phase.stage)}</span>`;
  return `<div class="phase">${square}<span>${esc(`${phase.id}${phase.title ? ` · ${phase.title}` : ""}`)}</span>${status}</div>`;
}

function sessions(model: PageModel, card: PageCard, now: Date): string {
  const writing = card.sessions.filter((session) => session.state === "writing");
  if (writing.length > 0) return `<div class="lane"><div class="h">Sessions</div><div class="fleet">${writing.map((session) => sessionChip(model.people, session, now)).join("")}</div></div>`;
  const last = card.sessions[0];
  const lastLine = last ? `${disc(model.people, { person: last.person, writing: false }, true)}<span>Last: ${esc(last.person)}, tree ${esc(last.tree)}, ${since(last.lastWriteAt, now)} ago.</span>` : "";
  return `<div class="lane"><div class="h">Sessions</div><div class="last">${disc(model.people, undefined, true)}<span>Nobody on it now.</span>${lastLine}</div></div>`;
}

function copy(card: PageCard): string {
  return `<button class="copy" type="button" data-copy="${esc(card.copy)}">Copy for Claude</button><p class="fine" aria-live="polite">Copies the card's id and where it stands, ready to paste into a session.</p>`;
}
