import { alignColumns } from "../core/columns";
import { ago, EMPTY, lane } from "./cells";
import type { OwnedSpec, PersonClaim, PersonPr, PersonSession, PersonWork } from "./model";
import { nowText } from "./render-focus";

const OWNS_SHOWN = 3;
const LOCAL_NOTE = "(--local: no claims or PRs)";

export function personSection(work: PersonWork, now: Date): string {
  const title = work.person.toUpperCase();
  const sessions = work.sessions ?? [];
  if (!work.local && work.owns.length + work.onNow.length + work.prs.length + sessions.length === 0) return `${title} — owns nothing, nothing on now`;
  const rows = [
    ["owns", ownsCell(work.owns)],
    ...(work.local ? [] : [["on now", joined(work.onNow.map((claim) => claimText(claim, now)))], ["PRs", joined(work.prs.map(prText))]]),
    ...(work.sessions ? [["sessions", sessionsCell(sessions)]] : []),
  ];
  return lane(title, [...alignColumns(rows), ...(work.local ? [LOCAL_NOTE] : [])]);
}

function ownsCell(owns: readonly OwnedSpec[]): string {
  const shown = owns.slice(0, OWNS_SHOWN).map(({ spec, now }) => {
    const state = now.kind === "finished" ? now.status : nowText(now);
    return state === EMPTY ? spec : `${spec} ${state}`;
  });
  return joined([...shown, ...(owns.length > OWNS_SHOWN ? [`+${owns.length - OWNS_SHOWN}`] : [])]);
}

function claimText(claim: PersonClaim, now: Date): string {
  return `${claim.spec} ${claim.phase} · claimed ${ago(new Date(claim.since), now)} ago ${claim.host ? `on ${claim.host}` : "here"}`;
}

// Spec PR branches read `feat/<spec>-pr-<group>` (trees/naming.ts). `none` (CI never ran) is
// dropped: between the row's `·` separators it read as an item of its own.
function prText({ branch, cell }: PersonPr): string {
  const name = branch.replace(/^feat\//, "").replace(/-pr-([^-]+)$/, " pr-$1");
  const verdict = cell.verdict && cell.verdict !== "none" ? ` · ${cell.verdict}` : "";
  return `#${cell.number}${cell.draft ? " draft" : ""} ${name}${verdict}`;
}

function sessionsCell(sessions: readonly PersonSession[]): string {
  if (sessions.length === 0) return EMPTY;
  const names = sessions.map((session) => (session.spec ? [session.spec, session.sub, session.phase].filter(Boolean).join(" ") : session.label));
  return `${sessions.length} here: ${names.join(" · ")}`;
}

function joined(parts: readonly string[]): string {
  return parts.length > 0 ? parts.join(" · ") : EMPTY;
}
