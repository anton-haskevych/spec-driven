import { parseFrontmatter } from "../core/frontmatter";
import { stringList } from "./project-ledger";

export type SeenInResult = { kind: "updated"; text: string } | { kind: "unchanged" } | { kind: "invalid"; reason: string };

const SEEN_IN_BLOCK = /^seen-in:.*(?:\n[ \t]+-.*)*/m;
const FENCE_END = /\n---\s*(\n|$)/;

export function addSeenIn(text: string, specName: string): SeenInResult {
  const parsed = parseFrontmatter(text);
  if (parsed.kind !== "ok") return { kind: "invalid", reason: "entry has no valid frontmatter" };
  const current = stringList(parsed.data, "seen-in");
  if (current.includes(specName)) return { kind: "unchanged" };

  const line = `seen-in: [${[...current, specName].join(", ")}]`;
  if (SEEN_IN_BLOCK.test(text)) return { kind: "updated", text: text.replace(SEEN_IN_BLOCK, line) };

  const closing = FENCE_END.exec(text.slice(3));
  if (!closing) return { kind: "invalid", reason: "frontmatter has no closing ---" };
  const insertAt = 3 + closing.index;
  return { kind: "updated", text: `${text.slice(0, insertAt)}\n${line}${text.slice(insertAt)}` };
}
