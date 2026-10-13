import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "../core/frontmatter";
import { parseJson } from "../pr/gh-records";

// `<claudeHome>/projects/<encoded cwd>/<sessionId>.jsonl`. The folder name encodes the cwd the session
// started in, so it is searched for rather than rebuilt. `claude rm` keeps the file.
export function lastTurnText(claudeHome: string, sessionId: string): string | undefined {
  const projects = join(claudeHome, "projects");
  if (!existsSync(projects)) return undefined;
  for (const folder of readdirSync(projects)) {
    const path = join(projects, folder, `${sessionId}.jsonl`);
    if (existsSync(path)) return parseLastTurn(readFileSync(path, "utf8"));
  }
  return undefined;
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
