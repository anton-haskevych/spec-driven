import type { BoardInputs } from "../board/inputs";
import type { AttentionRow, Board } from "../board/model";
import type { CardEnd, CardStatus, Commitment } from "../cards/card-doc";
import type { Priority } from "../core/schedule";
import { readCards, readSourceEntries } from "../cards/read";
import { readTags } from "../cards/tags";
import { INVALID_OWNER, ownerOf } from "../core/people";
import { questionRows } from "../questions/list";
import { recordViewOf } from "../record/read";
import type { SessionMode } from "../sessions/session-doc";
import { pageCards } from "./cards";
import type { DueWord } from "./due";
import { needRows } from "./needs";
import { pagePeople, type PagePerson } from "./people";
import { phasesOf } from "./phases";
import { planRows } from "./plan-rows";
import { pageQuestions } from "./questions";
import { pageSessions } from "./sessions";

export const PAGE_VERSION = 1;

// One phase square: hollow orange to do, half blue doing, full blue built, green live (merged, deployed, done).
export type Square = "todo" | "doing" | "built" | "live";
export type CardStage = "todo" | "moving" | "done";

export interface PagePhase {
  spec: string;
  id: string;
  title?: string;
  stage: string;
  square: Square;
}

export interface PageQuestion {
  id: string;
  spec: string;
  about: string;
  phase?: string;
  question: string;
  recommend?: string;
  askedAt: string;
  // What an answer from the page sends back as `ifVersion`.
  version: string;
}

// "writing": wrote in the last few minutes; "quiet": hasn't since; "silent": quiet with work no remote has.
export type SessionState = "writing" | "quiet" | "silent";

export interface PageSession {
  person: string;
  mode: SessionMode;
  host: string;
  tree: string;
  spec?: string;
  phase?: string;
  lastWriteAt: string;
  state: SessionState;
  unsaved?: { ahead: number; edited: number };
}

// Solid disc: a session is writing now; tinted: holds it.
export interface Who {
  person: string;
  writing: boolean;
}

export interface PageSource {
  quote: string;
  person?: string;
  app: string;
  at: string;
}

export interface PageCard {
  id: string;
  title: string;
  status: CardStatus;
  commitment: Commitment;
  priority?: Priority;
  due: DueWord;
  assignee?: string;
  tags: string[];
  covers: string[];
  stage: CardStage;
  phases: PagePhase[];
  // Specs the card covers whole: they show as one progress bar, not a square per phase.
  whole: string[];
  origin?: PageSource;
  otherSources: number;
  question?: PageQuestion;
  who: Who[];
  // Sessions on a covering spec in the last day, latest first.
  sessions: PageSession[];
  // How a done or dropped card ended, and the card's own note (Academy keeps its context there).
  closed?: CardEnd;
  note?: string;
  // The card's id and where it stands, for pasting into a session.
  copy: string;
}

export interface NeedRow {
  kind: AttentionRow["kind"];
  mark: "Q" | "PR" | "!" | "C" | "T";
  title: string;
  detail: string;
  late: boolean;
  // The person it waits on; absent: whoever looks.
  owner?: string;
  since?: string;
  spec?: string;
  card?: string;
  question?: PageQuestion;
}

export interface SpecPanel {
  spec: string;
  session?: PageSession;
  cards: string[];
}

export interface PlanRow {
  tag: string;
  untagged?: true;
  priority?: Priority;
  reason?: string;
  counts: { done: number; moving: number; todo: number };
  who: Who[];
  due: DueWord;
  waits: number;
  // Starts unfolded: something in it is overdue or waits on the viewer.
  unfolded: boolean;
  closed: boolean;
  panels: SpecPanel[];
  open: string[];
  done: string[];
}

export interface PageModel {
  version: typeof PAGE_VERSION;
  repo: string;
  generatedAt: string;
  me?: string;
  // Why there is nothing to show yet; absent once the board has a record.
  notice?: string;
  tip?: string;
  people: PagePerson[];
  needs: { rows: NeedRow[]; mine: number; others: { person: string; count: number }[] };
  sessions: PageSession[];
  cards: PageCard[];
  moving: string[];
  finishedToday: string[];
  plan: PlanRow[];
  totals: { done: number; all: number };
  board: Board;
}

export interface PageContext {
  people: readonly string[];
  now: Date;
}

const NO_RECORD = "The board is off here: no shared record yet. Cards, projects and sessions show once the board is on.";

export function buildPageModel(inputs: BoardInputs, board: Board, context: PageContext): PageModel {
  const { now } = context;
  const view = recordViewOf(inputs.plans.record);
  const sessions = pageSessions(inputs, now);
  const questions = view ? pageQuestions(questionRows(view)) : [];
  const cards = view ? pageCards({ docs: readCards(view), sources: (id) => readSourceEntries(view, id).map((entry) => entry.doc), phasesOf: phasesOf(inputs, board), sessions, questions, now }) : [];
  const people = pagePeople(context.people, [...sessions.map((session) => session.person), ...cards.flatMap((card) => (card.assignee ? [card.assignee] : []))]);
  const specOwner = (spec: string) => {
    const node = inputs.nodes.get(spec);
    const owner = node ? ownerOf(node.meta) : undefined;
    return owner === INVALID_OWNER ? undefined : owner;
  };
  const cardAsking = (question: PageQuestion) => cards.find((card) => card.question?.id === question.id && card.question.spec === question.spec)?.id;
  const needs = needRows(board, questions, { specOwner, cardAssignee: (id) => cards.find((card) => card.id === id)?.assignee, cardAsking, now });
  const live = cards.filter((card) => card.status !== "dropped");
  return {
    version: PAGE_VERSION,
    repo: inputs.repo,
    generatedAt: now.toISOString(),
    ...(board.me ? { me: board.me } : {}),
    ...(view ? (view.tip.kind === "at" ? { tip: view.tip.sha } : {}) : { notice: NO_RECORD }),
    people,
    needs,
    sessions,
    cards,
    moving: live.filter((card) => card.stage === "moving").map((card) => card.id),
    finishedToday: live.filter((card) => card.status === "done" && card.closed && sameDay(card.closed.at, now)).map((card) => card.id),
    plan: view ? planRows(live, readTags(view), { now }) : [],
    totals: { done: live.filter((card) => card.stage === "done").length, all: live.length },
    board,
  };
}

function sameDay(at: string, now: Date): boolean {
  const then = new Date(at);
  return then.toDateString() === now.toDateString();
}
