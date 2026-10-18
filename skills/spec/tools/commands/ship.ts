import { parseArgs } from "node:util";
import { landSpecField, planSpecField, type SpecFieldEdit, type SpecFieldPlan } from "../core/land-spec-field";
import { systemRunner, type Runner } from "../core/run";
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

export async function shipCommand(projectDir: string, args: readonly string[], runner: Runner = systemRunner): Promise<string> {
  const request = parseShipArgs(args);
  if (typeof request === "string") return request;
  const outcome = await landSpecField(projectDir, runner, shipEdit(request));
  return outcome.kind === "landed" ? `ship: ${request.spec} is ${request.mode} (${outcome.sha.slice(0, 7)})` : `ship: ${outcome.reason}`;
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
