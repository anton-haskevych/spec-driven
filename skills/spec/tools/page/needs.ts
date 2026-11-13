import type { AttentionRow, Board } from "../board/model";
import { attentionCells } from "../board/render";
import { samePerson } from "../core/people";
import type { NeedRow, PageModel, PageQuestion } from "./model";

export interface NeedOwners {
  // A malformed owner comes back as nobody's.
  specOwner: (spec: string) => string | undefined;
  cardAssignee: (card: string) => string | undefined;
  // The card a question is about, so its row opens that card.
  cardAsking: (question: PageQuestion) => string | undefined;
  now: Date;
}

const MARKS: Record<AttentionRow["kind"], NeedRow["mark"]> = {
  question: "Q",
  "open-pr": "PR",
  merge: "PR",
  fix: "PR",
  "pr-review": "PR",
  "pr-approved": "PR",
  "pr-changes": "PR",
  overdue: "!",
  "unsaved-work": "!",
  "card-close": "C",
  "card-open": "C",
  claim: "T",
  "remote-claim": "T",
  "idle-claim": "T",
  deploy: "T",
  prune: "T",
};
const ORDER: readonly NeedRow["mark"][] = ["Q", "PR", "!", "C", "T"];
const LATE = new Set<AttentionRow["kind"]>(["overdue", "unsaved-work", "fix"]);

// The board's needs-you rows in its own words, with the record's questions in place of their park rows so
// each carries the id and version an answer sends back.
export function needRows(board: Pick<Board, "lanes" | "me">, questions: readonly PageQuestion[], owners: NeedOwners): PageModel["needs"] {
  const asked = new Set(questions.map((question) => `${question.spec}#${question.phase}`));
  const fromBoard = board.lanes.needsYou.filter((row) => row.kind !== "question" || !asked.has(`${row.spec}#${row.phase}`)).map((row) => boardRow(row, owners));
  const rows = [...questions.map((question) => questionRow(question, owners)), ...fromBoard].toSorted((a, b) => ORDER.indexOf(a.mark) - ORDER.indexOf(b.mark));
  const mine = rows.filter((row) => isMine(row.owner, board.me));
  const others: { person: string; count: number }[] = [];
  for (const row of rows) {
    if (!row.owner || isMine(row.owner, board.me)) continue;
    const owner = row.owner;
    const known = others.find(({ person }) => person === owner || samePerson(person, owner));
    if (known) known.count += 1;
    else others.push({ person: owner, count: 1 });
  }
  return { rows, mine: mine.length, others };
}

function questionRow(question: PageQuestion, owners: NeedOwners): NeedRow {
  const owner = owners.specOwner(question.spec);
  const card = owners.cardAsking(question);
  return {
    kind: "question",
    mark: "Q",
    title: question.question,
    detail: question.phase ? `${question.spec} · phase ${question.phase}` : question.spec,
    late: false,
    ...(owner ? { owner } : {}),
    since: question.askedAt,
    spec: question.spec,
    ...(card ? { card } : {}),
    question,
  };
}

function boardRow(row: AttentionRow, owners: NeedOwners): NeedRow {
  const [title = "", ...rest] = attentionCells(row, owners.now);
  const owner = ownerOfRow(row, owners);
  return {
    kind: row.kind,
    mark: MARKS[row.kind],
    title,
    detail: rest.filter(Boolean).join(" · "),
    late: LATE.has(row.kind),
    ...(owner ? { owner } : {}),
    ...("since" in row ? { since: row.since } : {}),
    ...("spec" in row ? { spec: row.spec } : {}),
    ...("card" in row ? { card: row.card } : {}),
  };
}

function ownerOfRow(row: AttentionRow, owners: NeedOwners): string | undefined {
  if (row.kind === "card-close" || row.kind === "card-open") return owners.cardAssignee(row.card);
  if (row.kind === "unsaved-work") return row.who;
  if (row.kind === "prune") return undefined;
  return owners.specOwner(row.spec);
}

// Nobody's row is everyone's; with no git name to tell, every row is the viewer's.
export function isMine(owner: string | undefined, me: string | undefined): boolean {
  return owner === undefined || me === undefined || samePerson(owner, me) || owner === me;
}
