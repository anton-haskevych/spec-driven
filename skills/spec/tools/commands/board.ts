import { parseArgs } from "node:util";
import { loadBoard, type BoardRunners } from "../board/load";
import type { Board } from "../board/model";
import { boardFor, offerFor } from "../board/people";
import { LANES, renderBoard, type Lane } from "../board/render";
import type { Env } from "../core/env";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { defaultClaudeHome } from "../sessions/live";
import { ownSessionId } from "../sessions/own";

export const BOARD_USAGE = "board [focus|flight|ready|blocked|you] [--who <name|me>] [--for <name|me> [--keep <spec>]] [--json] [--local]";

export interface BoardDeps extends BoardRunners {
  now: Date;
  env: Env;
}

interface BoardArgs {
  lane?: Lane;
  // That person's work: FOCUS rows they own or work on.
  who?: string;
  // Offered to that person: ready rows theirs or nobody's, plus `keep`'s.
  for?: string;
  keep?: string;
  json: boolean;
  local: boolean;
}

export function systemBoardDeps(): BoardDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, claudeHome: defaultClaudeHome(), now: new Date(), env: process.env };
}

export async function boardCommand(projectDir: string, args: readonly string[], deps: BoardDeps = systemBoardDeps()): Promise<string> {
  const parsed = parseBoardArgs(args);
  if (typeof parsed === "string") return parsed;
  const loaded = await loadBoard(projectDir, { local: parsed.local, ownSessionId: ownSessionId(deps.env) }, deps, deps.now);
  const board = loaded.ok ? { ok: true as const, value: filtered(loaded.value, parsed) } : loaded;
  if (parsed.json) return JSON.stringify(board.ok ? { board: board.value } : { board: null, error: board.reason }, null, 2);
  return board.ok ? fenced(renderBoard(board.value, { lane: parsed.lane, who: parsed.who })) : `board unavailable: ${board.reason}`;
}

export function fenced(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

function filtered(board: Board, args: BoardArgs): Board {
  const theirs = args.who ? boardFor(board, args.who) : board;
  return args.for ? offerFor(theirs, args.for, args.keep) : theirs;
}

function parseBoardArgs(args: readonly string[]): BoardArgs | string {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: {
        json: { type: "boolean", default: false },
        local: { type: "boolean", default: false },
        who: { type: "string" },
        for: { type: "string" },
        keep: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
    const [word] = positionals;
    const lane = LANES.find((name) => name === word);
    if (word !== undefined && !lane) return `board: unknown lane ${word} (${LANES.join(", ")})`;
    if (values.who !== undefined && lane !== undefined && lane !== "focus") return `usage: ${BOARD_USAGE}`;
    if (values.for !== undefined && lane !== undefined && lane !== "ready") return `usage: ${BOARD_USAGE}`;
    if (values.keep !== undefined && !values.for) return `usage: ${BOARD_USAGE}`;
    const named = (key: "who" | "for" | "keep") => (values[key] ? { [key]: values[key] } : {});
    return { lane, ...named("who"), ...named("for"), ...named("keep"), json: values.json, local: values.local };
  } catch {
    return `usage: ${BOARD_USAGE}`;
  }
}
