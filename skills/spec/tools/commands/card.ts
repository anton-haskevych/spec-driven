import type { PhaseDeps } from "../plan/phase-writer";
import { addCard } from "./card/add";
import { addSource, coverCard, updateCard } from "./card/edit";
import { checkCards, listCards } from "./card/list";
import { systemPhaseDeps } from "./phase/context";

const QUOTE = '--quote "<their exact words>" --app <app> [--person <name>] [--at <when>] [--ref <ref>] [--ref-url <url>]';

export const CARD_USAGE = [
  `card add "<title>" ${QUOTE} [--commitment promised|asked|idea] [--priority p0-p3] [--due YYYY-MM-DD] [--assignee <name>] [--tag <name>]… [--note "<text>"]`,
  'update <id> [--title "<text>"] [--commitment …] [--status open|doing] [--priority p0-p3|none] [--due YYYY-MM-DD|none] [--assignee <name>|none] [--note "<text>"|none] [--if-version <v>]',
  `source <id> ${QUOTE} [--role mention|evidence|origin]`,
  "cover <id> <spec | spec#phases>… [--remove <ref>]…",
  "list [--all] [--tag <name>] [--json]",
  "check",
].join(" | ");

export function cardCommand(projectDir: string, args: readonly string[], deps: PhaseDeps = systemPhaseDeps()): string | Promise<string> {
  const [action, ...rest] = args;
  if (action === "add") return addCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "update") return updateCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "source") return addSource(projectDir, rest, deps, CARD_USAGE);
  if (action === "cover") return coverCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "list") return listCards(projectDir, rest, deps, CARD_USAGE);
  if (action === "check" && rest.length === 0) return checkCards(projectDir, deps);
  return `usage: ${CARD_USAGE}`;
}
