import { gitAt } from "../../core/git";
import { defaultBranch } from "../../core/run";
import { isoTimestamp } from "../../core/schedule";
import { boardBase } from "../../plan/board-base";
import { validateRecordDoc } from "../../plan/kinds";
import type { PhaseDeps } from "../../plan/phase-writer";
import { loadSettings } from "../../playbook/settings";
import { gitRecordPort } from "../../record/ref";
import { writeRecord } from "../../record/write";
import { resolveAssignee } from "../../cards/people";
import { addCardPlan, type AddCardIntent } from "../../cards/plans";
import { NO_DEFAULT_BRANCH } from "../push";
import { cardFlags, choices, originOf, type CardFlags } from "./flags";
import { NO_ORIGIN, refusedLine, writtenReason } from "./send";

// Never queued: Claude quotes the new number at once, and a queued card could come back with another.
export async function addCard(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const flags = cardFlags(args);
  const title = flags?.positionals[0];
  if (!flags || flags.positionals.length !== 1 || !title?.trim()) return `usage: ${usage}`;
  const origin = originOf(flags, deps);
  if (typeof origin === "string") return refusedLine("add", origin);
  const branch = defaultBranch(projectDir, deps.runner);
  if (!branch) return refusedLine("add", NO_DEFAULT_BRANCH.replace("nothing pushed", "nothing written"));
  const git = gitAt(projectDir, deps.runner);
  const port = gitRecordPort(git);
  if (!port) return refusedLine("add", NO_ORIGIN);
  const base = await boardBase(git, branch, "a new card");
  if (!base.ok) return refusedLine("add", base.reason);
  const intent = addIntent(title, flags, origin, loadSettings(base.value.projectDir).board.people, isoTimestamp(deps.now()));
  if ("refused" in intent) return refusedLine("add", intent.refused);
  let line = "card: added";
  const written = await writeRecord(port, addCardPlan(intent, (seen) => (line = seen)), { validate: validateRecordDoc });
  if (written.kind === "landed") return line;
  if (written.kind === "offline") return refusedLine("add", `Can't reach origin (${written.reason}); a new card is never queued, so add it again when origin answers.`);
  return refusedLine("add", written.kind === "unchanged" ? "nothing to write" : writtenReason(written, "add"));
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
    ...(values.note ? { note: values.note } : {}),
    at,
    origin,
  };
}
