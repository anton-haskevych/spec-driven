import { gitAt } from "../../core/git";
import { defaultBranch } from "../../core/run";
import { isoTimestamp } from "../../core/schedule";
import { loadNodes } from "../../graph/nodes";
import { boardBase } from "../../plan/board-base";
import { validateRecordDoc } from "../../plan/kinds";
import type { PhaseDeps } from "../../plan/phase-writer";
import { loadSettings } from "../../playbook/settings";
import { stampedBy } from "../../sessions/facts";
import { gitRecordPort } from "../../record/ref";
import { writeRecord, type RecordPlan } from "../../record/write";
import { coverRefProblem } from "../../cards/cover";
import { resolveAssignee } from "../../cards/people";
import { addCardPlan, type AddCardIntent, type See } from "../../cards/plans";
import { NO_DEFAULT_BRANCH } from "../push";
import { cardFlags, choices, originOf, type CardFlags } from "./flags";
import { NO_ORIGIN, refusedLine, writtenReason } from "./send";

// What a new card needs from the default branch: its people, and the time it is added.
export type NewCardIntent = (people: readonly string[], at: string) => AddCardIntent | { refused: string };

export async function addCard(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const flags = cardFlags(args);
  const title = flags?.positionals[0];
  if (!flags || flags.positionals.length !== 1 || !title?.trim()) return `usage: ${usage}`;
  const origin = originOf(flags, deps);
  if (typeof origin === "string") return refusedLine("add", origin);
  const covers = coverProblems(projectDir, flags.values.cover ?? []);
  if (covers) return refusedLine("add", covers);
  return landNewCard(projectDir, deps, "add", (people, at) => addIntent(title, flags, origin, people, at), addCardPlan);
}

// Never queued: Claude quotes the new number at once, and a queued card could come back with another.
export async function landNewCard(projectDir: string, deps: PhaseDeps, action: string, intentFor: NewCardIntent, planOf: (intent: AddCardIntent, see: See) => RecordPlan): Promise<string> {
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return refusedLine(action, NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written"));
  const git = gitAt(projectDir, deps.runner);
  const port = gitRecordPort(git);
  if (!port) return refusedLine(action, NO_ORIGIN);
  const base = await boardBase(git, branch, "a new card");
  if (!base.ok) return refusedLine(action, base.reason);
  const intent = intentFor(loadSettings(base.value.projectDir).board.people, isoTimestamp(deps.now()));
  if ("refused" in intent) return refusedLine(action, intent.refused);
  let line = "card: added";
  const written = await writeRecord(port, stampedBy(git, deps.env, projectDir, deps.now())(planOf(intent, (seen) => (line = seen))), { validate: validateRecordDoc });
  if (written.kind === "landed") return line;
  if (written.kind === "offline") return refusedLine(action, `Can't reach origin (${written.reason}); a new card is never queued, so run card ${action} again when origin answers.`);
  return refusedLine(action, written.kind === "unchanged" ? "nothing to write" : writtenReason(written, action));
}

// Checked against this checkout: prep covers a spec whose folder isn't on the default branch yet.
export function coverProblems(projectDir: string, refs: readonly string[]): string | undefined {
  if (refs.length === 0) return undefined;
  const nodes = loadNodes(projectDir);
  const problems = refs.flatMap((ref) => coverRefProblem(ref, nodes) ?? []);
  return problems.length > 0 ? problems.join("; ") : undefined;
}

function addIntent(title: string, flags: CardFlags, origin: AddCardIntent["origin"], people: readonly string[], at: string): AddCardIntent | { refused: string } {
  const { values } = flags;
  const chosen = choices(values);
  if (typeof chosen === "string") return { refused: chosen };
  const assignee = values.assignee === undefined ? undefined : resolveAssignee(values.assignee, people);
  if (assignee && "refused" in assignee) return assignee;
  return {
    title: title.trim(),
    commitment: chosen.commitment ?? "asked",
    ...(chosen.priority ? { priority: chosen.priority } : {}),
    ...(values.due ? { due: values.due } : {}),
    ...(assignee ? { assignee: assignee.name } : {}),
    tags: values.tag ?? [],
    ...(values.cover?.length ? { coveredBy: values.cover } : {}),
    ...(values.note ? { note: values.note } : {}),
    at,
    origin,
  };
}
