import type { CardDoc } from "../cards/card-doc";
import type { SourceDoc } from "../cards/source-doc";
import { samePerson } from "../core/people";
import { parseRef } from "../graph/relations";
import { dueWord } from "./due";
import type { CardStage, PageCard, PagePhase, PageQuestion, PageSession, PageSource, Who } from "./model";

export interface CardInputs {
  docs: readonly CardDoc[];
  sources: (card: string) => readonly SourceDoc[];
  phasesOf: (ref: string) => PagePhase[];
  sessions: readonly PageSession[];
  questions: readonly PageQuestion[];
  now: Date;
}

export function pageCards(inputs: CardInputs): PageCard[] {
  return inputs.docs.map((doc) => pageCard(doc, inputs));
}

function pageCard(doc: CardDoc, inputs: CardInputs): PageCard {
  const phases = uniquePhases(doc.coveredBy.flatMap(inputs.phasesOf));
  const specs = new Set(doc.coveredBy.map((ref) => parseRef(ref).target));
  const sessions = inputs.sessions.filter((session) => session.spec !== undefined && specs.has(session.spec));
  const question = inputs.questions.find((each) => each.about === `card:${doc.id}`) ?? inputs.questions.find((each) => phases.some((phase) => phase.spec === each.spec && phase.id === each.phase));
  const sources = inputs.sources(doc.id);
  const origin = sources.find((source) => source.role === "origin");
  const card: Omit<PageCard, "copy"> = {
    id: doc.id,
    title: doc.title,
    status: doc.status,
    commitment: doc.commitment,
    ...(doc.priority ? { priority: doc.priority } : {}),
    due: dueWord(doc.status === "done" || doc.status === "dropped" ? undefined : doc.due, inputs.now),
    ...(doc.assignee ? { assignee: doc.assignee } : {}),
    tags: doc.tags,
    covers: doc.coveredBy,
    stage: stageOf(doc, phases),
    phases,
    ...(origin ? { origin: sourceOf(origin) } : {}),
    otherSources: sources.length - (origin ? 1 : 0),
    ...(question ? { question } : {}),
    who: whoOf(doc, sessions),
    sessions,
    ...(doc.closed ? { closed: doc.closed } : {}),
    ...(doc.note ? { note: doc.note } : {}),
  };
  return { ...card, copy: copyFor(card) };
}

function uniquePhases(phases: readonly PagePhase[]): PagePhase[] {
  const seen = new Set<string>();
  return phases.filter((phase) => {
    const key = `${phase.spec}#${phase.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Moving: someone set it doing, or a covering phase has started; a card whose phases all shipped stays
// moving until a session closes it with evidence.
export function stageOf(doc: Pick<CardDoc, "status">, phases: readonly PagePhase[]): CardStage {
  if (doc.status === "done") return "done";
  if (doc.status === "doing" || phases.some((phase) => phase.square !== "todo")) return "moving";
  return "todo";
}

function whoOf(doc: CardDoc, sessions: readonly PageSession[]): Who[] {
  const who: Who[] = [];
  const add = (person: string, writing: boolean) => {
    const known = who.find((each) => samePerson(each.person, person) || each.person === person);
    if (known) known.writing ||= writing;
    else who.push({ person, writing });
  };
  for (const session of sessions) add(session.person, session.state === "writing");
  if (doc.assignee) add(doc.assignee, false);
  return who;
}

function sourceOf(source: SourceDoc): PageSource {
  return { quote: source.quote, ...(source.person ? { person: source.person } : {}), app: source.app, at: source.occurredAt };
}

function copyFor(card: Omit<PageCard, "copy">): string {
  const facts = [card.tags.join(", "), card.priority].filter(Boolean).join(", ");
  const covers = card.covers.length > 0 ? `covered by ${card.covers.join(", ")}` : "covered by nothing yet";
  const waits = card.question ? `, waits on question ${card.question.id} (${card.question.spec})` : "";
  return `Card ${card.id} "${card.title}"${facts ? ` (${facts})` : ""}, ${card.status}, ${covers}${waits}. Tell me where it stands and what is next.`;
}
