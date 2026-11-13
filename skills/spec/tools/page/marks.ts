import { ago } from "../board/cells";
import type { Priority } from "../core/schedule";
import type { DueWord } from "./due";
import type { PageCard, PagePhase, PageSession, Square, Who } from "./model";
import { personOf, type PagePerson } from "./people";
import { HUES } from "./styles";

export const esc = (text: string): string => Bun.escapeHTML(text);

export function pri(priority: Priority | undefined): string {
  return priority ? `<span class="pri ${priority}">${priority.toUpperCase()}</span>` : `<span class="pri none">–</span>`;
}

export function disc(people: readonly PagePerson[], who: Who | undefined, small = false): string {
  const size = small ? " sm" : "";
  if (!who) return `<span class="who none${size}" title="nobody has it"></span>`;
  const person = personOf(people, who.person);
  const hue = person ? ` h${person.hue % HUES}` : "";
  return `<span class="who${hue}${who.writing ? " on" : ""}${size}" title="${esc(who.person)}">${esc(person?.initial ?? who.person.charAt(0).toUpperCase())}</span>`;
}

export function discs(people: readonly PagePerson[], who: readonly Who[], small = false): string {
  return who.length > 0 ? who.map((each) => disc(people, each, small)).join("") : disc(people, undefined, small);
}

// A card's covers: a bar per spec it covers whole, then a square per phase it names.
export function coverStrip(card: Pick<PageCard, "phases" | "whole">): string {
  const bars = card.whole.map((spec) => specBar(spec, card.phases.filter((phase) => phase.spec === spec)));
  return `<span class="strip">${bars.join("")}${squares(card.phases.filter((phase) => !card.whole.includes(phase.spec)))}</span>`;
}

export function specBar(spec: string, phases: readonly PagePhase[]): string {
  const counts = phaseCounts(phases);
  const words = [`${counts.done} done`, `${counts.moving} moving`, `${counts.todo} to do`].filter((word) => !word.startsWith("0 "));
  return `<span class="spec-bar" title="${esc(`${spec}: ${words.join(", ")}`)}">${pbar(counts)}<span class="n">${counts.done}/${phases.length}</span></span>`;
}

function phaseCounts(phases: readonly PagePhase[]): { done: number; moving: number; todo: number } {
  const count = (kinds: readonly Square[]) => phases.filter((phase) => kinds.includes(phase.square)).length;
  return { done: count(["live"]), moving: count(["doing", "built"]), todo: count(["todo"]) };
}

function squares(phases: readonly PagePhase[]): string {
  return phases.map((phase) => `<i class="sq${phase.square === "todo" ? "" : ` ${phase.square}`}" title="${esc(`${phase.id}${phase.title ? ` · ${phase.title}` : ""}: ${phase.stage}`)}"></i>`).join("");
}

export function due(word: DueWord, small = false): string {
  const kind = word.kind === "date" ? "" : ` ${word.kind}`;
  return `<span class="due${kind}${small ? " sm" : ""}">${esc(word.text)}</span>`;
}

export function waits(text: string): string {
  return `<span class="waits">${esc(text)}</span>`;
}

export function pbar(counts: { done: number; moving: number; todo: number }): string {
  const parts = [["d", counts.done], ["m", counts.moving], ["t", counts.todo]] as const;
  const shown = parts.filter(([, count]) => count > 0);
  if (shown.length === 0) return `<span class="pbar empty"></span>`;
  return `<span class="pbar">${shown.map(([kind, count]) => `<i class="${kind}" style="flex:${count}"></i>`).join("")}</span>`;
}

export function pcount(counts: { done: number; moving: number; todo: number }): string {
  const parts = [["d", counts.done, "done"], ["m", counts.moving, "moving"], ["t", counts.todo, "to do"]] as const;
  const shown = parts.filter(([, count]) => count > 0).map(([kind, count, word]) => `<span class="${kind}">${count} ${word}</span>`);
  return `<span class="pcount">${shown.length > 0 ? shown.join("") : `<span class="z">no cards yet</span>`}</span>`;
}

export function since(at: string, now: Date): string {
  return ago(new Date(at), now).replace("<1m", "now");
}

export function sessionName(session: PageSession): string {
  const what = session.spec ? session.spec.replaceAll("-", " ") : `${session.mode} · ${session.tree}`;
  return session.phase ? `${what} ${session.phase}` : what;
}

export function sessionChip(people: readonly PagePerson[], session: PageSession, now: Date, mini = false): string {
  const who = disc(people, { person: session.person, writing: session.state === "writing" }, true);
  const when = session.state === "writing" ? `<span class="now">now</span>` : since(session.lastWriteAt, now);
  const unsaved = session.unsaved ? ` · ${unsavedWords(session.unsaved)}` : "";
  const name = mini ? "" : `<b>${esc(sessionName(session))}</b>`;
  const where = `${session.person} on ${session.host}, tree ${session.tree}`;
  return `<span class="sess${session.state === "silent" ? " silent" : ""}${mini ? " mini" : ""}" title="${esc(where)}">${who}${name}${when}${unsaved}</span>`;
}

function unsavedWords({ ahead, edited }: { ahead: number; edited: number }): string {
  const parts = [ahead > 0 ? `${ahead} ${ahead === 1 ? "commit" : "commits"} not pushed` : "", edited > 0 ? `${edited} ${edited === 1 ? "file" : "files"} not committed` : ""];
  return parts.filter(Boolean).join(", ");
}
