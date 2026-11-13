import { relative } from "node:path";
import { loadBacklog } from "../../backlog/items";
import { backlogCardIntent, importCardPlan } from "../../cards/backlog-card";
import type { PhaseDeps } from "../../plan/phase-writer";
import { parseFlags } from "../phase/args";
import { coverProblems, landNewCard } from "./add";
import { refusedLine } from "./send";

// `card import <slug> [--cover <ref>]…`: a backlog file becomes a card when it is next touched (promoted,
// closed, dropped or re-prioritised); the session then moves the file to `_backlog/_closed/`.
export async function importCard(projectDir: string, args: readonly string[], deps: PhaseDeps, usage: string): Promise<string> {
  const parsed = parseFlags(args, { cover: { type: "string", multiple: true } });
  const [name, ...extra] = parsed?.positionals ?? [];
  if (!parsed || !name || extra.length > 0) return `usage: ${usage}`;
  const slug = name.replace(/^.*\//, "").replace(/\.md$/, "");
  const item = loadBacklog(projectDir).find((each) => each.slug === slug);
  if (!item) return refusedLine("import", `No backlog file docs/specs/_backlog/${slug}.md in this checkout.`);
  const covers = parsed.values.cover ?? [];
  const problem = coverProblems(projectDir, covers);
  if (problem) return refusedLine("import", problem);
  return landNewCard(projectDir, deps, "import", (_people, at) => backlogCardIntent(item, relative(projectDir, item.file), at, covers), importCardPlan);
}
