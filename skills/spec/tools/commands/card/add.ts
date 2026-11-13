import { loadNodes } from "../../graph/nodes";
import type { PhaseDeps } from "../../plan/phase-writer";
import type { RecordPlan } from "../../record/write";
import { coverRefProblem } from "../../cards/cover";
import { resolveAssignee } from "../../cards/people";
import { addCardPlan, type AddCardIntent, type See } from "../../cards/plans";
import { cardFlags, choices, originOf, type CardFlags } from "./flags";
import { landNow } from "./land";
import { refusedLine } from "./send";

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

export async function landNewCard(projectDir: string, deps: PhaseDeps, action: string, intentFor: NewCardIntent, planOf: (intent: AddCardIntent, see: See) => RecordPlan): Promise<string> {
  const landed = await landNow(projectDir, deps, action, (people, at) => {
    const intent = intentFor(people, at);
    return "refused" in intent ? intent : (see) => planOf(intent, see);
  });
  return landed || "card: added";
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
