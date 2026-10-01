import { parseArgs } from "node:util";
import { loadBoard, type BoardRunners } from "../board/load";
import { LANES, renderBoard, type Lane } from "../board/render";
import { systemAsyncRunner, systemRunner } from "../core/run";

export const BOARD_USAGE = "board [flight|ready|blocked|you] [--json] [--local]";

export interface BoardDeps extends BoardRunners {
  now: Date;
}

export function systemBoardDeps(): BoardDeps {
  return { runner: systemRunner, asyncRunner: systemAsyncRunner, now: new Date() };
}

export async function boardCommand(projectDir: string, args: readonly string[], deps: BoardDeps = systemBoardDeps()): Promise<string> {
  const parsed = parseBoardArgs(args);
  if (typeof parsed === "string") return parsed;
  const board = await loadBoard(projectDir, { local: parsed.local }, deps, deps.now);
  if (parsed.json) return JSON.stringify(board.ok ? { board: board.value } : { board: null, error: board.reason }, null, 2);
  return board.ok ? fenced(renderBoard(board.value, { lane: parsed.lane })) : `board unavailable: ${board.reason}`;
}

export function fenced(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

function parseBoardArgs(args: readonly string[]): { lane?: Lane; json: boolean; local: boolean } | string {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: { json: { type: "boolean", default: false }, local: { type: "boolean", default: false } },
      allowPositionals: true,
      strict: true,
    });
    const [word] = positionals;
    const lane = LANES.find((name) => name === word);
    if (word !== undefined && !lane) return `board: unknown lane ${word} (${LANES.join(", ")})`;
    return { lane, json: values.json, local: values.local };
  } catch {
    return `usage: ${BOARD_USAGE}`;
  }
}
