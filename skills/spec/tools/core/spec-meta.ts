import { stringField, stringList, type FrontmatterData } from "./frontmatter";
import { readSchedule, type Priority } from "./schedule";

export const FOCUS_BANDS = ["must", "should", "could"] as const;
export type FocusBand = (typeof FOCUS_BANDS)[number];
export const BAND_CHOICES = `${FOCUS_BANDS.slice(0, -1).join(", ")} or ${FOCUS_BANDS.at(-1)}`;

// How a finished PR group ships: merged on green, or held green for Anton's review.
export const SHIP_MODES = ["auto", "hold-for-review"] as const;
export type ShipMode = (typeof SHIP_MODES)[number];

// What a 2.37.0 numeric rank reads as until it is rewritten to a band.
const LEGACY_RANK_BAND: FocusBand = "should";

export interface SpecMeta {
  area: string[];
  domain: string[];
  scope: string[];
  updated?: string;
  priority?: Priority;
  due?: string;
  focus?: FocusBand;
  owner?: string;
  // `owner:` is present but not a name; read owners through ownerOf (core/people.ts).
  ownerInvalid?: true;
  ship?: ShipMode;
  // Open work whose spec text no longer matches the code or decisions: a health flag, not a status.
  stale?: string;
  // Why an abandoned spec didn't ship, when no other spec supersedes it.
  dropped?: string;
}

// One-line notes on a spec's lifecycle; see SKILL.md → Relations between specs.
export const LIFECYCLE_NOTES = ["stale", "dropped"] as const;
type LifecycleNote = (typeof LIFECYCLE_NOTES)[number];

export type LifecycleFields = Partial<Record<LifecycleNote, string>> & { problems: string[] };

export interface FocusFields {
  focus?: FocusBand;
  owner?: string;
  ownerInvalid?: true;
  problems: string[];
  warnings: string[];
}

export interface ShipField {
  ship?: ShipMode;
  problems: string[];
}

export function readSpecMeta(data: FrontmatterData): SpecMeta {
  const { priority, due } = readSchedule(data);
  const { focus, owner, ownerInvalid } = readFocusFields(data);
  return {
    area: stringList(data, "area"),
    domain: stringList(data, "domain"),
    scope: stringList(data, "scope"),
    updated: stringField(data, "updated"),
    priority,
    due,
    focus,
    owner,
    ...(ownerInvalid ? { ownerInvalid } : {}),
    ship: readShipField(data).ship,
    ...lifecycleNotes(readLifecycleFields(data)),
  };
}

export function readLifecycleFields(data: FrontmatterData): LifecycleFields {
  const fields: LifecycleFields = { problems: [] };
  for (const key of LIFECYCLE_NOTES) {
    if (!Object.hasOwn(data, key)) continue;
    const value = data[key];
    const line = typeof value === "string" ? value.trim() : "";
    if (line !== "" && !line.includes("\n")) fields[key] = line;
    else fields.problems.push(`${key} must be one line of text, not ${JSON.stringify(value)}`);
  }
  return fields;
}

function lifecycleNotes({ problems: _problems, ...notes }: LifecycleFields): Partial<Record<LifecycleNote, string>> {
  return notes;
}

export function readFocusFields(data: FrontmatterData): FocusFields {
  const fields: FocusFields = { problems: [], warnings: [] };
  if (Object.hasOwn(data, "focus")) {
    const raw = data.focus;
    const band = focusBand(raw);
    if (band) fields.focus = band;
    else if (isLegacyRank(raw)) {
      fields.focus = LEGACY_RANK_BAND;
      fields.warnings.push(`focus ${raw} is a 2.37.0 rank; use ${BAND_CHOICES}`);
    } else fields.problems.push(`focus ${JSON.stringify(raw)} is not one of ${FOCUS_BANDS.join(", ")}`);
  }
  if (Object.hasOwn(data, "owner")) {
    const owner = stringField(data, "owner");
    if (owner !== undefined) fields.owner = owner;
    else {
      fields.ownerInvalid = true;
      fields.problems.push(`owner ${JSON.stringify(data.owner)} is not a name`);
    }
  }
  return fields;
}

export function readShipField(data: FrontmatterData): ShipField {
  if (!Object.hasOwn(data, "ship")) return { problems: [] };
  const ship = shipMode(data.ship);
  return ship ? { ship, problems: [] } : { problems: [`ship ${JSON.stringify(data.ship)} is not one of ${SHIP_MODES.join(", ")}`] };
}

export function shipMode(value: unknown): ShipMode | undefined {
  if (typeof value !== "string") return undefined;
  const wanted = value.trim().toLowerCase();
  return SHIP_MODES.find((mode) => mode === wanted);
}

export function focusBand(value: unknown): FocusBand | undefined {
  if (typeof value !== "string") return undefined;
  const wanted = value.trim().toLowerCase();
  return FOCUS_BANDS.find((band) => band === wanted);
}

function isLegacyRank(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
