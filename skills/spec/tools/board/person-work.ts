import { ownerOf, samePerson } from "../core/people";
import type { Result } from "../core/result";
import type { LiveSession } from "../sessions/live";
import { isFinished, type SpecNode } from "../graph/nodes";
import { attributeSessions } from "./attribution";
import { focusNow, focusSession } from "./focus";
import type { BoardInputs } from "./inputs";
import { toPrCell } from "./joins";
import type { Board, OwnedNow, OwnedSpec, PersonClaim, PersonPr, PersonSession, PersonWork } from "./model";
import { ME } from "./people";

type Matches = (name: string | undefined) => boolean;

const ENDED = new Set(["good-enough", "abandoned"]);

// One person across every spec, not focusWork's per-row buckets (craft → Don't extract).
export function personWork(inputs: BoardInputs, board: Board, who: string): PersonWork {
  const mine = who === ME || (board.me !== undefined && samePerson(who, board.me));
  const person = mine ? board.me : who;
  const theirs: Matches = (name) => person !== undefined && name !== undefined && samePerson(name, person);
  return {
    person: person ?? ME,
    mine,
    owns: ownedSpecs(inputs, board, theirs),
    onNow: liveClaims(inputs, theirs, mine),
    prs: authoredPrs(inputs, theirs),
    ...(mine && inputs.sessions !== "local" ? { sessions: mySessions(inputs.sessions, inputs) } : {}),
    ...(inputs.prs === "local" ? { local: true as const } : {}),
  };
}

function ownedSpecs(inputs: BoardInputs, board: Board, theirs: Matches): OwnedSpec[] {
  return [...inputs.nodes.values()]
    .filter((node) => theirs(ownerOf(node.meta)))
    .map((node) => ({ spec: node.spec.name, now: ownedNow(node, board, inputs) }))
    .toSorted((a, b) => Number(a.now.kind === "finished") - Number(b.now.kind === "finished") || a.spec.localeCompare(b.spec));
}

function ownedNow(node: SpecNode, board: Board, inputs: BoardInputs): OwnedNow {
  const now = focusNow(node, board.lanes, inputs);
  if (now.kind !== "none" || !isFinished(node)) return now;
  return { kind: "finished", status: ENDED.has(node.status ?? "") ? (node.status ?? "") : "done" };
}

// A remote claim never reads done (gotcha-remote-claims-never-read-as-done): base decides.
function liveClaims({ claims, states }: BoardInputs, theirs: Matches, mine: boolean): PersonClaim[] {
  const doneOnBase = (spec: string, phase: string) => states.get(spec)?.phases.some((candidate) => candidate.id === phase && candidate.done) ?? false;
  return claims.flatMap(({ claim, status, holder }): PersonClaim[] => {
    const here = mine && (status === "live" || status === "unknown");
    const elsewhere = status === "remote" && theirs(holder?.user);
    if (!(here || elsewhere) || doneOnBase(claim.spec, claim.phase)) return [];
    return [{ spec: claim.spec, phase: claim.phase, since: claim.claimedAt, ...(elsewhere && holder ? { host: holder.host } : {}) }];
  });
}

function authoredPrs({ prs }: BoardInputs, theirs: Matches): PersonPr[] {
  if (prs === "local" || !prs.ok) return [];
  return prs.value.filter((pr) => pr.state === "OPEN" && theirs(pr.author)).map((pr) => ({ branch: pr.branch, cell: toPrCell(pr) }));
}

// attributeSessions keeps this repo's sessions only (gotcha-session-files-span-every-repo).
function mySessions(sessions: Result<LiveSession[]>, inputs: BoardInputs): PersonSession[] {
  if (!sessions.ok) return [];
  const { bySpec, unattributed } = attributeSessions(sessions.value, inputs, new Set(inputs.nodes.keys()));
  const placed = [...bySpec].flatMap(([spec, found]) => found.map((session) => ({ ...focusSession(session, spec), spec })));
  return [...placed, ...unattributed.map((session) => focusSession(session))];
}
