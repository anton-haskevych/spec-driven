import { removeFrontmatterLine, setFrontmatterLine, type FrontmatterPatch } from "../core/frontmatter-patch";
import { focusPosition, rankFor, sortFocus, type FocusEntry, type FocusPlace } from "./rank";

export type MovePlace = Exclude<FocusPlace, { kind: "end" }>;

export type FocusAction =
  | { kind: "add"; spec: string; place: FocusPlace }
  | { kind: "move"; spec: string; place: MovePlace }
  | { kind: "drop"; spec: string };

export interface FocusLanded {
  verb: "added" | "moved" | "dropped";
  spec: string;
  position?: { position: number; total: number };
}

export type FocusPlan = { kind: "write"; text: string; message: string; landed: FocusLanded } | { kind: "refused"; reason: string };

const FOCUS_KEY = "focus";
const VERBS = { add: "added", move: "moved", drop: "dropped" } as const;

export function planFocus(action: FocusAction, entries: readonly FocusEntry[], claudeMd: string): FocusPlan {
  const current = focusPosition(entries, action.spec);
  if (action.kind === "add" && current) return refused(`${action.spec} is already in focus (${current.position}/${current.total})`);
  if (action.kind !== "add" && !current) return refused(`${action.spec} is not in focus`);
  if (action.kind === "drop") return written(action, removeFrontmatterLine(claudeMd, FOCUS_KEY));

  const rank = rankFor(entries, action.spec, action.place);
  if (rank === undefined) return refused(noRank(action.place, entries, action.spec));
  const placed = [...entries.filter((entry) => entry.spec !== action.spec), { spec: action.spec, rank }];
  return written(action, setFrontmatterLine(claudeMd, FOCUS_KEY, String(rank)), focusPosition(placed, action.spec));
}

function written(action: FocusAction, patch: FrontmatterPatch, position?: FocusLanded["position"]): FocusPlan {
  if (patch.kind === "invalid") return refused(`${action.spec}'s CLAUDE.md: ${patch.reason}`);
  const landed: FocusLanded = { verb: VERBS[action.kind], spec: action.spec, ...(position ? { position } : {}) };
  return { kind: "write", text: patch.text, message: `[focus] ${action.kind} ${action.spec}`, landed };
}

function noRank(place: FocusPlace, entries: readonly FocusEntry[], spec: string): string {
  if (place.kind === "after") return `--after ${place.spec}: ${place.spec} is not in focus`;
  const lowest = sortFocus(entries.filter((entry) => entry.spec !== spec))[0]?.spec ?? "";
  return `--top: ${lowest} is at rank 0, so nothing fits above it; move ${lowest} down first`;
}

function refused(reason: string): FocusPlan {
  return { kind: "refused", reason };
}
