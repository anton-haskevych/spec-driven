import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { isRecord, parseFrontmatter, type FrontmatterData } from "../core/frontmatter";
import { isGateKind, type GateKind } from "../core/gate";
import { SHIP_MODES, type ShipMode } from "../core/spec-meta";

export const SETTINGS_FILE = join("docs", "specs", "_playbook", "settings.md");

const DOCS_HOMES = ["main", "branch"] as const;
export const MERGE_METHODS = ["squash", "merge", "rebase"] as const;
export type MergeMethod = (typeof MERGE_METHODS)[number];

export interface ProjectSettings {
  file?: string;
  docs: (typeof DOCS_HOMES)[number];
  pr: { draft: boolean; merge?: MergeMethod; ship?: ShipMode };
  checks: { external: string[] };
  gates: { afterMergeMain?: string; bootstrap?: string; perCommit?: string; ciTriage?: string };
  deploy?: DeploySetting;
  crew: CrewSetting;
}

// The standing go: how many sessions the overseer runs, and which gate kinds a worker passes itself.
export interface CrewSetting {
  workers: number;
  babysitters: number;
  selfApprove: GateKind[];
}

// Only infra deploys are babysat: a merged PR touching `paths` goes through the `gate` section.
export interface DeploySetting {
  paths: string[];
  gate: string;
}

export interface ParsedSettings {
  settings: ProjectSettings;
  problems: string[];
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  docs: "branch",
  pr: { draft: true },
  checks: { external: [] },
  gates: {},
  crew: { workers: 3, babysitters: 2, selfApprove: [] },
};

const SECTION_KEYS: Record<string, readonly string[]> = {
  pr: ["draft", "merge", "ship"],
  checks: ["external"],
  gates: ["after-merge-main", "bootstrap", "per-commit", "ci-triage"],
  deploy: ["paths", "gate"],
  crew: ["workers", "babysitters", "self-approve"],
};
const TOP_KEYS = new Set(["docs", ...Object.keys(SECTION_KEYS)]);

export function loadSettings(projectDir: string): ProjectSettings {
  const file = join(projectDir, SETTINGS_FILE);
  const text = readTextIfExists(file);
  return text === undefined ? DEFAULT_SETTINGS : { ...parseSettings(text).settings, file };
}

export function parseSettings(text: string): ParsedSettings {
  const parsed = parseFrontmatter(text);
  if (parsed.kind === "none") return withProblem("settings.md has no frontmatter; put the settings between --- lines");
  if (parsed.kind === "invalid") return withProblem(parsed.error);

  const problems: string[] = [];
  const data = parsed.data;
  const section = (key: string) => sectionOf(data, key, problems);
  const pr = section("pr");
  const checks = section("checks");
  const gates = section("gates");
  const deploy = deploySetting(section("deploy"), data.deploy !== undefined, problems);
  const settings: ProjectSettings = {
    docs: oneOf(data.docs, DOCS_HOMES, "docs", problems) ?? DEFAULT_SETTINGS.docs,
    pr: {
      draft: draftFlag(pr.draft, problems),
      ...optional("merge", oneOf(pr.merge, MERGE_METHODS, "pr.merge", problems)),
      ...optional("ship", oneOf(pr.ship, SHIP_MODES, "pr.ship", problems)),
    },
    checks: { external: stringArray(checks.external, "checks.external", problems) },
    gates: {
      ...optional("afterMergeMain", gateName(gates["after-merge-main"], "gates.after-merge-main", problems)),
      ...optional("bootstrap", gateName(gates.bootstrap, "gates.bootstrap", problems)),
      ...optional("perCommit", gateName(gates["per-commit"], "gates.per-commit", problems)),
      ...optional("ciTriage", gateName(gates["ci-triage"], "gates.ci-triage", problems)),
    },
    ...optional("deploy", deploy),
    crew: crewSetting(section("crew"), problems),
  };
  problems.push(...Object.keys(data).filter((key) => !TOP_KEYS.has(key)).map((key) => `unknown key: ${key}`));
  return { settings, problems };
}

export function describeSettings(settings: ProjectSettings): string {
  const { pr, checks, gates, deploy, crew } = settings;
  const defaultCaps = crew.workers === DEFAULT_SETTINGS.crew.workers && crew.babysitters === DEFAULT_SETTINGS.crew.babysitters;
  return [
    `docs on ${settings.docs}`,
    `PRs ${pr.draft ? "draft" : "ready"}`,
    pr.merge ? `merge ${pr.merge}` : "merge: ask the user",
    ...(pr.ship ? [`ship ${pr.ship}`] : []),
    ...(defaultCaps ? [] : [`crew ${crew.workers} workers, ${crew.babysitters} babysitters`]),
    ...(crew.selfApprove.length > 0 ? [`self-approve gates ${crew.selfApprove.join(", ")}`] : []),
    ...(checks.external.length > 0 ? [`external checks ${checks.external.join(", ")}`] : []),
    ...(gates.perCommit ? [`each commit: gate ${gates.perCommit}`] : []),
    ...(gates.afterMergeMain ? [`after merging main: gate ${gates.afterMergeMain}`] : []),
    ...(gates.bootstrap ? [`fresh worktree: gate ${gates.bootstrap}`] : []),
    ...(gates.ciTriage ? [`CI triage: gate ${gates.ciTriage}`] : []),
    ...(deploy ? [`deploy: gate ${deploy.gate} for ${deploy.paths.length} ${deploy.paths.length === 1 ? "path" : "paths"}`] : []),
  ].join(" · ");
}

function deploySetting(section: FrontmatterData, present: boolean, problems: string[]): DeploySetting | undefined {
  const paths = stringArray(section.paths, "deploy.paths", problems);
  const gate = gateName(section.gate, "deploy.gate", problems);
  if (paths.length > 0 && gate) return { paths, gate };
  if (present) problems.push("deploy needs both paths and gate");
  return undefined;
}

// Words that aren't gate kinds are dropped here and reported as errors by the doctor.
export function selfApproveKinds(words: readonly string[]): { kinds: GateKind[]; unknown: string[] } {
  return { kinds: words.filter(isGateKind), unknown: words.filter((word) => !isGateKind(word)) };
}

function crewSetting(section: FrontmatterData, problems: string[]): CrewSetting {
  const defaults = DEFAULT_SETTINGS.crew;
  return {
    workers: count(section.workers, "crew.workers", problems) ?? defaults.workers,
    babysitters: count(section.babysitters, "crew.babysitters", problems) ?? defaults.babysitters,
    selfApprove: selfApproveKinds(stringArray(section["self-approve"], "crew.self-approve", problems)).kinds,
  };
}

function count(value: unknown, key: string, problems: string[]): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  problems.push(`${key} must be a whole number, 0 or more`);
  return undefined;
}

function sectionOf(data: FrontmatterData, key: string, problems: string[]): FrontmatterData {
  const value = data[key];
  if (value === undefined) return {};
  if (!isRecord(value)) {
    problems.push(`${key} must be a map, e.g. ${key}: { ${SECTION_KEYS[key]?.[0]}: <value> }`);
    return {};
  }
  const known = SECTION_KEYS[key] ?? [];
  problems.push(...Object.keys(value).filter((name) => !known.includes(name)).map((name) => `${key} has an unknown key: ${name}`));
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], key: string, problems: string[]): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  const choices = allowed.length === 2 ? allowed.join(" or ") : `${allowed.slice(0, -1).join(", ")} or ${allowed.at(-1)}`;
  problems.push(`${key} must be ${choices}, not "${String(value)}"`);
  return undefined;
}

function draftFlag(value: unknown, problems: string[]): boolean {
  if (value === undefined) return DEFAULT_SETTINGS.pr.draft;
  if (typeof value === "boolean") return value;
  problems.push("pr.draft must be true or false");
  return DEFAULT_SETTINGS.pr.draft;
}

function stringArray(value: unknown, key: string, problems: string[]): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  problems.push(`${key} must be a list of strings, e.g. ${key}: ["Vercel*"]`);
  return [];
}

function gateName(value: unknown, key: string, problems: string[]): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim()) return value.trim();
  problems.push(`${key} must name a gates.md section`);
  return undefined;
}

function optional<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

function withProblem(problem: string): ParsedSettings {
  return { settings: DEFAULT_SETTINGS, problems: [problem] };
}
