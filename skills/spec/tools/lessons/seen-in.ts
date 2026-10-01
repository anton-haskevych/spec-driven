import { setFrontmatterLine } from "../core/frontmatter-patch";
import { parseFrontmatter, stringList } from "../core/frontmatter";

export type SeenInResult = { kind: "updated"; text: string } | { kind: "unchanged" } | { kind: "invalid"; reason: string };

export function addSeenIn(text: string, specName: string): SeenInResult {
  const parsed = parseFrontmatter(text);
  if (parsed.kind !== "ok") return { kind: "invalid", reason: "entry has no valid frontmatter" };
  const current = stringList(parsed.data, "seen-in");
  if (current.includes(specName)) return { kind: "unchanged" };

  const patched = setFrontmatterLine(text, "seen-in", `[${[...current, specName].join(", ")}]`);
  return patched.kind === "ok" ? { kind: "updated", text: patched.text } : patched;
}
