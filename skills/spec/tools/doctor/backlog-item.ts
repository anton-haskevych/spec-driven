import { parseFrontmatter, stringField } from "../core/frontmatter";
import { readSchedule } from "../core/schedule";
import { error, warning, type Issue } from "./issue";

const WORD_LIMIT = 120;

export function checkBacklogItem(file: string, text: string, closed: boolean): Issue[] {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") return [error(file, "backlog item has no frontmatter (needs at least title)")];
  if (parsed.kind === "invalid") return [error(file, parsed.error)];

  const issues: Issue[] = [];
  if (!stringField(parsed.data, "title")) issues.push(error(file, "frontmatter has no title"));
  issues.push(...readSchedule(parsed.data).problems.map((problem) => error(file, problem)));

  const resolution = stringField(parsed.data, "resolution");
  if (closed && !resolution) issues.push(error(file, "closed item has no resolution; say how it ended"));
  if (!closed && resolution) issues.push(warning(file, "has a resolution but sits with open items; move it to _backlog/_closed/"));

  const words = parsed.body.split(/\s+/).filter(Boolean).length;
  if (words > WORD_LIMIT) issues.push(warning(file, `description is ${words} words; keep an idea under ${WORD_LIMIT}, or prep a spec`));
  return issues;
}
