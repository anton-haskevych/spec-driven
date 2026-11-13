import type { PhaseDeps } from "../plan/phase-writer";
import { addCard } from "./card/add";
import { endCard } from "./card/close";
import { importCard } from "./card/import";
import { addSource, coverCard, updateCard } from "./card/edit";
import { checkCards, listCards } from "./card/list";
import { tagCommand } from "./card/tag";
import { systemPhaseDeps } from "./phase/context";

const QUOTE = '--quote "<their exact words>" --app <app> [--person <name>] [--at <when>] [--ref <ref>] [--ref-url <url>]';

export const CARD_USAGE = [
  `card add "<title>" ${QUOTE} [--commitment promised|asked|idea] [--priority p0-p3] [--due YYYY-MM-DD] [--assignee <name>] [--tag <name>]… [--cover <spec | spec#phases>]… [--note "<text>"]`,
  "import <backlog-slug> [--cover <spec | spec#phases>]…",
  'update <id> [--title "<text>"] [--commitment …] [--status open|doing] [--priority p0-p3|none] [--due YYYY-MM-DD|none] [--assignee <name>|none] [--note "<text>"|none] [--if-version <v>]',
  `source <id> ${QUOTE} [--role mention|evidence|origin]`,
  "cover <id> <spec | spec#phases>… [--remove <ref>]…",
  'close <id> "<evidence: a merged commit, a data check, the assignee\'s word>"',
  'drop <id> "<reason>"',
  "tag <id> <tag>… [--remove <tag>]…",
  'tag <tag> [--kind customer|area|other] [--priority p0-p3|none] [--summary "<text>"|none]',
  "list [--all] [--tag <name>] [--json]",
  "check",
].join(" | ");

export function cardCommand(projectDir: string, args: readonly string[], deps: PhaseDeps = systemPhaseDeps()): string | Promise<string> {
  const [action, ...rest] = args;
  if (action === "add") return addCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "import") return importCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "update") return updateCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "source") return addSource(projectDir, rest, deps, CARD_USAGE);
  if (action === "cover") return coverCard(projectDir, rest, deps, CARD_USAGE);
  if (action === "close") return endCard(projectDir, "done", rest, deps, CARD_USAGE);
  if (action === "drop") return endCard(projectDir, "dropped", rest, deps, CARD_USAGE);
  if (action === "tag") return tagCommand(projectDir, rest, deps, CARD_USAGE);
  if (action === "list") return listCards(projectDir, rest, deps, CARD_USAGE);
  if (action === "check" && rest.length === 0) return checkCards(projectDir, deps);
  return `usage: ${CARD_USAGE}`;
}
