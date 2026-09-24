import { parseFrontmatter, stringField } from "../core/frontmatter";
import { error, warning, type Issue } from "./issue";

const LIST_FIELDS = ["paths", "seen-in"];

export function checkProjectLesson(file: string, text: string): Issue[] {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") return [error(file, "project lesson has no frontmatter (needs kind, paths, seen-in)")];
  if (parsed.kind === "invalid") return [error(file, parsed.error)];

  const issues: Issue[] = [];
  if (!stringField(parsed.data, "kind")) issues.push(error(file, "frontmatter has no kind"));
  for (const key of LIST_FIELDS) {
    const value = parsed.data[key];
    if (value !== undefined && !Array.isArray(value)) issues.push(error(file, `${key} must be a list, e.g. ${key}: [a, b]`));
  }
  if (parsed.data.paths === undefined) {
    issues.push(warning(file, "has no paths; recall can only surface it through the INDEX"));
  }
  return issues;
}
