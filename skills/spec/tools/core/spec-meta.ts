import { stringField, stringList, type FrontmatterData } from "./frontmatter";
import { readSchedule, type Priority } from "./schedule";

export const FOCUS_BANDS = ["must", "should", "could"] as const;
export type FocusBand = (typeof FOCUS_BANDS)[number];
export const BAND_CHOICES = `${FOCUS_BANDS.slice(0, -1).join(", ")} or ${FOCUS_BANDS.at(-1)}`;

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
}

export interface FocusFields {
  focus?: FocusBand;
  owner?: string;
  problems: string[];
  warnings: string[];
}

export function readSpecMeta(data: FrontmatterData): SpecMeta {
  const { priority, due } = readSchedule(data);
  const { focus, owner } = readFocusFields(data);
  return {
    area: stringList(data, "area"),
    domain: stringList(data, "domain"),
    scope: stringList(data, "scope"),
    updated: stringField(data, "updated"),
    priority,
    due,
    focus,
    owner,
  };
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
    else fields.problems.push(`owner ${JSON.stringify(data.owner)} is not a name`);
  }
  return fields;
}

export function focusBand(value: unknown): FocusBand | undefined {
  if (typeof value !== "string") return undefined;
  const wanted = value.trim().toLowerCase();
  return FOCUS_BANDS.find((band) => band === wanted);
}

function isLegacyRank(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
