import { parseArgs } from "node:util";
import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { landFocus, type LandOutcome } from "../focus/land";
import type { FocusAction, MovePlace } from "../focus/plan";
import { NO_DEFAULT_BRANCH } from "./push";

interface FocusFlags {
  spec: string;
  top: boolean;
  after?: string;
}

interface FocusVerb {
  usage: string;
  action(flags: FocusFlags): FocusAction | undefined;
}

const ACTIONS: Record<string, FocusVerb> = {
  add: {
    usage: "focus add <spec> [--top | --after <spec>]",
    action: ({ spec, top, after }) => (top && after ? undefined : { kind: "add", spec, place: placeOf(top, after) ?? { kind: "end" } }),
  },
  drop: { usage: "focus drop <spec>", action: ({ spec, top, after }) => (top || after ? undefined : { kind: "drop", spec }) },
  move: {
    usage: "focus move <spec> (--top | --after <spec>)",
    action: ({ spec, top, after }) => {
      const place = top && after ? undefined : placeOf(top, after);
      return place ? { kind: "move", spec, place } : undefined;
    },
  },
};

export const FOCUS_USAGE = Object.values(ACTIONS)
  .map((verb) => verb.usage)
  .join(" | ");

export function parseFocusArgs(args: readonly string[]): FocusAction | string {
  const [name, ...rest] = args;
  const verb = name !== undefined && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
  if (!verb) return `usage: ${FOCUS_USAGE}`;
  const flags = parseFlags(rest);
  const action = flags && verb.action(flags);
  return action ?? `usage: ${verb.usage}`;
}

export async function focusCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner): Promise<string> {
  const action = parseFocusArgs(args);
  if (typeof action === "string") return action;
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `focus: ${NO_DEFAULT_BRANCH}`;
  return focusLine(action, await landFocus(gitAt(projectDir, runner), { defaultBranch: branch, action }));
}

export function focusLine(action: FocusAction, outcome: LandOutcome): string {
  if (outcome.kind === "refused") return `focus ${action.kind}: ${outcome.reason}`;
  if (outcome.kind === "failed") return `focus: ${outcome.reason}`;
  const { verb, spec, position } = outcome.landed;
  const sha = outcome.sha.slice(0, 7);
  if (!position) return `focus: ${verb} ${spec} (${sha})`;
  const where = `${position.position}/${position.total}`;
  return `focus: ${verb} ${spec} ${verb === "added" ? "at" : "to"} ${where} (${sha})`;
}

function placeOf(top: boolean, after: string | undefined): MovePlace | undefined {
  if (top) return { kind: "top" };
  return after ? { kind: "after", spec: after } : undefined;
}

function parseFlags(args: string[]): FocusFlags | undefined {
  try {
    const { values, positionals } = parseArgs({
      args,
      options: { top: { type: "boolean" }, after: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
    const [spec, ...extra] = positionals;
    if (!spec || extra.length > 0) return undefined;
    return { spec, top: values.top ?? false, ...(values.after ? { after: values.after } : {}) };
  } catch {
    return undefined;
  }
}
