import { parseArgs } from "node:util";
import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { BAND_CHOICES, FOCUS_BANDS, focusBand } from "../core/spec-meta";
import { landFocus, type LandOutcome } from "../focus/land";
import type { FocusAction } from "../focus/plan";
import { NO_DEFAULT_BRANCH } from "./push";

type FocusVerb = FocusAction["kind"];

const BAND_ARG = `<${FOCUS_BANDS.join("|")}>`;
const USAGES: Record<FocusVerb, string> = {
  add: `focus add <spec> ${BAND_ARG}`,
  drop: "focus drop <spec>",
  move: `focus move <spec> ${BAND_ARG}`,
};
const GONE_FLAGS = ["--top", "--after"];
const GONE_FLAGS_LINE = `focus: ${GONE_FLAGS.join(" and ")} are gone; give a band (${FOCUS_BANDS.join(", ")})`;

export const FOCUS_USAGE = Object.values(USAGES).join(" | ");

export function parseFocusArgs(args: readonly string[]): FocusAction | string {
  const [name, ...rest] = args;
  if (!isVerb(name)) return `usage: ${FOCUS_USAGE}`;
  const usage = `usage: ${USAGES[name]}`;
  if (rest.some(isGoneFlag)) return `${usage}\n${GONE_FLAGS_LINE}`;
  const [spec, word, ...extra] = positionals(rest) ?? [];
  if (spec === undefined || extra.length > 0) return usage;
  if (name === "drop") return word === undefined ? { kind: name, spec } : usage;
  if (word === undefined) return usage;
  const band = focusBand(word);
  return band ? { kind: name, spec, band } : `focus ${name}: ${word} is not a band; use ${BAND_CHOICES}`;
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
  const { verb, spec, band } = outcome.landed;
  const sha = outcome.sha.slice(0, 7);
  return band ? `focus: ${verb} ${spec} to ${band} (${sha})` : `focus: ${verb} ${spec} (${sha})`;
}

function isVerb(name: string | undefined): name is FocusVerb {
  return name !== undefined && Object.hasOwn(USAGES, name);
}

function isGoneFlag(arg: string): boolean {
  return GONE_FLAGS.some((flag) => arg === flag || arg.startsWith(`${flag}=`));
}

function positionals(args: string[]): string[] | undefined {
  try {
    return parseArgs({ args, options: {}, allowPositionals: true, strict: true }).positionals;
  } catch {
    return undefined;
  }
}
