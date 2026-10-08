import { parseFrontmatter } from "../core/frontmatter";
import { removeFrontmatterLine, setFrontmatterLine, type FrontmatterPatch } from "../core/frontmatter-patch";
import { focusBand, type FocusBand } from "../core/spec-meta";

export type FocusAction = { kind: "add" | "move"; spec: string; band: FocusBand } | { kind: "drop"; spec: string };

export interface FocusLanded {
  verb: "added" | "moved" | "dropped";
  spec: string;
  band?: FocusBand;
}

export type FocusPlan = { kind: "write"; text: string; message: string; landed: FocusLanded } | { kind: "refused"; reason: string };

// A 2.37.0 rank or a malformed value has the key but no band: add overwrites it, drop removes it.
interface CurrentFocus {
  hasKey: boolean;
  band?: FocusBand;
}

const FOCUS_KEY = "focus";
const VERBS = { add: "added", move: "moved", drop: "dropped" } as const;

export function planFocus(action: FocusAction, claudeMd: string): FocusPlan {
  const current = currentFocus(claudeMd);
  if (action.kind === "drop") return current.hasKey ? written(action, removeFrontmatterLine(claudeMd, FOCUS_KEY)) : refused(`${action.spec} is not in focus`);
  if (action.kind === "add" && current.band) return refused(`${action.spec} is already in focus (${current.band}); use move`);
  if (action.kind === "move" && !current.band) return refused(`${action.spec} is not in focus`);
  if (action.kind === "move" && current.band === action.band) return refused(`${action.spec} is already ${action.band}`);
  return written(action, setFrontmatterLine(claudeMd, FOCUS_KEY, action.band));
}

function currentFocus(claudeMd: string): CurrentFocus {
  const parsed = parseFrontmatter(claudeMd);
  if (parsed.kind !== "ok" || !Object.hasOwn(parsed.data, FOCUS_KEY)) return { hasKey: false };
  const band = focusBand(parsed.data[FOCUS_KEY]);
  return band ? { hasKey: true, band } : { hasKey: true };
}

function written(action: FocusAction, patch: FrontmatterPatch): FocusPlan {
  if (patch.kind === "invalid") return refused(`${action.spec}'s CLAUDE.md: ${patch.reason}`);
  const landed: FocusLanded = { verb: VERBS[action.kind], spec: action.spec, ...(action.kind === "drop" ? {} : { band: action.band }) };
  return { kind: "write", text: patch.text, message: `[focus] ${action.kind} ${action.spec}`, landed };
}

function refused(reason: string): FocusPlan {
  return { kind: "refused", reason };
}
