import { parseFrontmatter, stringField } from "../core/frontmatter";
import { error, warning, type Issue } from "./issue";

const TIMESTAMP_FIELDS = ["created", "updated"];

export function checkSpecMeta(file: string, text: string, statuses: readonly string[]): Issue[] {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") return [];
  if (parsed.kind === "invalid") return [error(file, parsed.error)];

  const issues: Issue[] = [];
  const status = stringField(parsed.data, "status");
  if (!status) {
    issues.push(error(file, "frontmatter has no status"));
  } else if (statuses.length > 0 && !statuses.includes(status)) {
    issues.push(error(file, `status "${status}" is not allowed here; use one of: ${statuses.join(", ")}`));
  }
  for (const key of TIMESTAMP_FIELDS) {
    if (!stringField(parsed.data, key)) issues.push(warning(file, `frontmatter has no ${key}`));
  }
  return issues;
}
