import { parseArgs } from "node:util";
import { landSpecField, planSpecField, type SpecFieldEdit, type SpecFieldPlan } from "../core/land-spec-field";
import { systemRunner, type Runner } from "../core/run";
import { fieldLine, systemFieldDeps, writeJoinedField, type FieldWriteDeps } from "./spec-field-write";
import { SHIP_MODES, shipMode, type ShipMode } from "../core/spec-meta";

export interface ShipRequest {
  spec: string;
  mode: ShipMode;
}

const SHIP_KEY = "ship";
const MODE_CHOICES = `${SHIP_MODES.slice(0, -1).join(", ")} or ${SHIP_MODES.at(-1)}`;

export const SHIP_USAGE = `ship <spec> <${SHIP_MODES.join("|")}>`;

export function parseShipArgs(args: readonly string[]): ShipRequest | string {
  const [spec, word, ...extra] = positionals(args) ?? [];
  if (spec === undefined || word === undefined || extra.length > 0) return `usage: ${SHIP_USAGE}`;
  const mode = shipMode(word);
  return mode ? { spec, mode } : `ship: ${word} is not a ship mode; use ${MODE_CHOICES}`;
}

export async function shipCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner, deps: FieldWriteDeps = systemFieldDeps(runner)): Promise<string> {
  const request = parseShipArgs(args);
  if (typeof request === "string") return request;
  const edit = shipEdit(request);
  const landed = (sha: string) => `ship: ${request.spec} is ${request.mode} (${sha})`;
  const joined = await writeJoinedField(projectDir, { spec: request.spec, key: "ship", value: request.mode }, deps);
  if (joined) return fieldLine("ship", joined, landed, edit.already);
  const outcome = await landSpecField(projectDir, runner, edit);
  return outcome.kind === "landed" ? landed(outcome.sha.slice(0, 7)) : `ship: ${outcome.reason}`;
}

export function planShip(request: ShipRequest, claudeMd: string): SpecFieldPlan {
  return planSpecField(shipEdit(request), claudeMd);
}

function shipEdit({ spec, mode }: ShipRequest): SpecFieldEdit {
  return { spec, key: SHIP_KEY, value: mode, same: (current) => shipMode(current) === mode, already: `${spec} is already ${mode}`, message: `[ship] ${spec} ${mode}` };
}

function positionals(args: readonly string[]): string[] | undefined {
  try {
    return parseArgs({ args: [...args], options: {}, allowPositionals: true, strict: true }).positionals;
  } catch {
    return undefined;
  }
}
