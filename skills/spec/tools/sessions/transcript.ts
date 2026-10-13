import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../core/frontmatter";
import { parseJson } from "../pr/gh-records";

// `<claudeHome>/projects/<encoded cwd>/<sessionId>.jsonl`. The folder name encodes the cwd the session
// started in, so it is searched for rather than rebuilt. `claude rm` keeps the file. A background
// session's short id (`claude agents`' `id`) is its session id's prefix, which is all a gone one leaves.
export function lastTurnText(claudeHome: string, sessionIdOrPrefix: string): string | undefined {
  const projects = join(claudeHome, "projects");
  if (!existsSync(projects)) return undefined;
  for (const folder of readdirSync(projects)) {
    const dir = join(projects, folder);
    const exact = join(dir, `${sessionIdOrPrefix}.jsonl`);
    const file = existsSync(exact) ? exact : prefixMatch(dir, sessionIdOrPrefix);
    if (file) return parseLastTurn(readFileSync(file, "utf8"));
  }
  return undefined;
}

function prefixMatch(dir: string, prefix: string): string | undefined {
  if (!statSync(dir).isDirectory()) return undefined;
  const name = readdirSync(dir).find((entry) => entry.startsWith(prefix) && entry.endsWith(".jsonl"));
  return name ? join(dir, name) : undefined;
}

// Everything the assistant said since the last prompt; tool results come back as user entries too.
export function parseLastTurn(jsonl: string): string {
  let said: string[] = [];
  for (const raw of jsonl.split("\n")) {
    const entry = parseJson(raw);
    if (!isRecord(entry) || !isRecord(entry.message)) continue;
    const content = entry.message.content;
    if (entry.type === "user" && isPrompt(content)) said = [];
    if (entry.type === "assistant") said.push(...textBlocks(content));
  }
  return said.join("\n");
}

function isPrompt(content: unknown): boolean {
  return typeof content === "string" || textBlocks(content).length > 0;
}

function textBlocks(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) => (isRecord(block) && block.type === "text" && typeof block.text === "string" ? [block.text] : []));
}
