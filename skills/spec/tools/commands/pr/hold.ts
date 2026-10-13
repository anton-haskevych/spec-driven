import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { systemRunner } from "../../core/run";
import { holdPr, type HoldDeps, type HoldRequest } from "../../pr/actions/hold";

export const PR_HOLD_USAGE = "pr hold [<pr> | <spec-name> [<group>]] --how-to-review <file>";

const systemDeps: HoldDeps = { runner: systemRunner };

export function prHold(projectDir: string, args: readonly string[], deps: HoldDeps = systemDeps): string {
  const request = parseHoldArgs(projectDir, args);
  return typeof request === "string" ? request : holdPr(projectDir, request, deps);
}

function parseHoldArgs(projectDir: string, args: readonly string[]): HoldRequest | string {
  let parsed;
  try {
    parsed = parseArgs({ args: [...args], options: { "how-to-review": { type: "string" } }, allowPositionals: true, strict: true });
  } catch {
    return `usage: ${PR_HOLD_USAGE}`;
  }
  const file = parsed.values["how-to-review"];
  if (file === undefined || parsed.positionals.length > 2) return `usage: ${PR_HOLD_USAGE}`;
  const howToReview = resolve(projectDir, file);
  return existsSync(howToReview) ? { target: parsed.positionals, howToReview } : `pr hold: no file ${file}`;
}
