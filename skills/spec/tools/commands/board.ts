import { parseArgs } from "node:util";
import { loadBoard, type BoardRunners } from "../board/load";
import { boardFor } from "../board/people";
import { LANES, renderBoard, type Lane } from "../board/render";
import type { Env } from "../core/env";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { defaultClaudeHome } from "../sessions/live";
import { ownSessionId } from "../sessions/own";

export const BOARD_USAGE = "board [focus|flight|ready|blocked|you] [--who <name|me>] [--json] [--local]";

export interface BoardDeps extends BoardRunners {
  now: Date;
  env: Env;
}

export function systemBoardDeps(): BoardDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome(), now: new Date(), env: process.env };
}

export async function boardCommand(projectDir: string, args: readonly string[], deps: BoardDeps = systemBoardDeps()): Promise<string> {
  const parsed = parseBoardArgs(args);
  if (typeof parsed === "string") return parsed;
  const loaded = await loadBoard(projectDir, { local: parsed.local, ownSessionId: ownSessionId(deps.env) }, deps, deps.now);
  const board = loaded.ok && parsed.who ? { ok: true as const, value: boardFor(loaded.value, parsed.who) } : loaded;
  if (parsed.json) return JSON.stringify(board.ok ? { board: board.value } : { board: null, error: board.reason }, null, 2);
  return board.ok ? fenced(renderBoard(board.value, { lane: parsed.lane, who: parsed.who })) : `board unavailable: ${board.reason}`;
}

export function fenced(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

function parseBoardArgs(args: readonly string[]): { lane?: Lane; who?: string; json: boolean; local: boolean } | string {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: { json: { type: "boolean", default: false }, local: { type: "boolean", default: false }, who: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
    const [word] = positionals;
    const lane = LANES.find((name) => name === word);
    if (word !== undefined && !lane) return `board: unknown lane ${word} (${LANES.join(", ")})`;
    if (values.who !== undefined && lane !== undefined && lane !== "focus") return `usage: ${BOARD_USAGE}`;
    return { lane, ...(values.who ? { who: values.who } : {}), json: values.json, local: values.local };
  } catch {
    return `usage: ${BOARD_USAGE}`;
  }
}
