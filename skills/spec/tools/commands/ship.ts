import { parseArgs } from "node:util";
import { join } from "node:path";
import { readTextIfExists } from "../core/files";
import { parseFrontmatter } from "../core/frontmatter";
import { setFrontmatterLine } from "../core/frontmatter-patch";
import { gitAt } from "../core/git";
import { landOnMain, type MainEditPlan } from "../core/land-on-main";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { SHIP_MODES, shipMode, type ShipMode } from "../core/spec-meta";
import { findSpecs } from "../core/spec-folders";
import { NO_DEFAULT_BRANCH } from "./push";

export interface ShipRequest {
  spec: string;
  mode: ShipMode;
}

type ShipPlan = { kind: "write"; text: string; message: string; landed: ShipRequest } | { kind: "unchanged" | "refused"; reason: string };

const SHIP_KEY = "ship";
const MODE_CHOICES = `${SHIP_MODES.slice(0, -1).join(", ")} or ${SHIP_MODES.at(-1)}`;

export const SHIP_USAGE = `ship <spec> <${SHIP_MODES.join("|")}>`;

export function parseShipArgs(args: readonly string[]): ShipRequest | string {
  const [spec, word, ...extra] = positionals(args) ?? [];
  if (spec === undefined || word === undefined || extra.length > 0) return `usage: ${SHIP_USAGE}`;
  const mode = shipMode(word);
  return mode ? { spec, mode } : `ship: ${word} is not a ship mode; use ${MODE_CHOICES}`;
}

export async function shipCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner): Promise<string> {
  const request = parseShipArgs(args);
  if (typeof request === "string") return request;
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `ship: ${NO_DEFAULT_BRANCH}`;
  const outcome = await landOnMain(gitAt(projectDir, runner), branch, (dir) => shipEdit(dir, branch, request));
  return outcome.kind === "landed" ? `ship: ${request.spec} is ${request.mode} (${outcome.sha.slice(0, 7)})` : `ship: ${outcome.reason}`;
}

export function planShip(request: ShipRequest, claudeMd: string): ShipPlan {
  const parsed = parseFrontmatter(claudeMd);
  if (parsed.kind === "ok" && shipMode(parsed.data[SHIP_KEY]) === request.mode) return { kind: "unchanged", reason: `${request.spec} is already ${request.mode}` };
  const patch = setFrontmatterLine(claudeMd, SHIP_KEY, request.mode);
  if (patch.kind === "invalid") return { kind: "refused", reason: `${request.spec}'s CLAUDE.md: ${patch.reason}` };
  return { kind: "write", text: patch.text, message: `[ship] ${request.spec} ${request.mode}`, landed: request };
}

function shipEdit(projectDir: string, branch: string, request: ShipRequest): MainEditPlan<ShipRequest> {
  const specs = findSpecs(projectDir, request.spec);
  const [spec] = specs;
  if (!spec) return { kind: "refused", reason: `no spec named ${request.spec} on origin/${branch}; land the spec first` };
  if (specs.length > 1) return { kind: "refused", reason: `${specs.length} specs are named ${request.spec} on origin/${branch}` };
  const file = join(spec.dir, "CLAUDE.md");
  const plan = planShip(request, readTextIfExists(file) ?? "");
  return plan.kind === "write" ? { ...plan, file } : plan;
}

function positionals(args: readonly string[]): string[] | undefined {
  try {
    return parseArgs({ args: [...args], options: {}, allowPositionals: true, strict: true }).positionals;
  } catch {
    return undefined;
  }
}
