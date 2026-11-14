import { ago } from "../board/cells";
import type { Env } from "../core/env";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import { recordPortsOf, type Seamed } from "../core/git-seams";
import { systemRunner, type Runner } from "../core/run";
import { readRecordCopy, refreshRecordCopy } from "../record/mirror";
import { dropEntry, flushOutbox, listOutbox, outboxDir, refusedFor, type IntentRunners } from "../record/outbox";
import type { Validate } from "../record/plan-writes";
import { ownSessionId } from "../sessions/own";
import { intentRunners } from "../plan/intents";
import { validateRecordDoc } from "../plan/kinds";
import { EXPORT_USAGE, recordExport } from "./record-export";

export const RECORD_USAGE = `record status | sync | drop <n> | ${EXPORT_USAGE.replace("record ", "")}`;

export interface RecordDeps extends Seamed {
  runner: Runner;
  env: Env;
  now: () => Date;
  runners(git: Git): IntentRunners;
  validate: Validate;
}

interface RecordWorld {
  git: Git;
  commonDir: string;
  outbox: string;
  deps: RecordDeps;
}

export function systemRecordDeps(): RecordDeps {
  return { runner: systemRunner, env: process.env, now: () => new Date(), runners: intentRunners, validate: validateRecordDoc };
}

export async function recordCommand(projectDir: string, args: readonly string[], deps: RecordDeps = systemRecordDeps()): Promise<string> {
  const [action, n, ...extra] = args;
  const usage = `usage: ${RECORD_USAGE}`;
  if (action === "export" && n !== undefined && (extra.length === 0 || (extra.length === 1 && extra[0] === "--unjoin"))) return recordExport(projectDir, n, extra.length === 1, deps);
  if (extra.length > 0 || (action !== "drop" && n !== undefined)) return usage;
  const git = gitAt(projectDir, deps.runner);
  const commonDir = gitCommonDir(git);
  if (!commonDir.ok) return `record: ${commonDir.reason}`;
  const world = { git, commonDir: commonDir.value, outbox: outboxDir(commonDir.value), deps };
  if (action === "status") return `record: ${statusLine(world)}`;
  if (action === "sync") return `record: ${await syncLine(world)}`;
  if (action === "drop" && n !== undefined && /^\d+$/.test(n)) return dropEntry(world.outbox, Number(n)) ? `record: dropped #${n}` : `record: no queued change #${n}`;
  return usage;
}

function statusLine(world: RecordWorld): string {
  const tip = recordPortsOf(world.git, world.deps)?.read.trackingTip();
  const tipPart = tip ? `tip ${tip.slice(0, 7)}` : "no record fetched yet";
  return [tipPart, copyPart(world), ...outboxParts(world)].join(" · ");
}

async function syncLine(world: RecordWorld): Promise<string> {
  const port = recordPortsOf(world.git, world.deps)?.port;
  if (!port) return "this repo has no origin; the board's record lives there";
  const flushed = await flushOutbox(port, world.outbox, world.deps.runners(world.git), { validate: world.deps.validate });
  if (flushed.kind === "offline") return offlineLine(world);
  const tip = port.fetchTip();
  if (tip.kind === "offline") return offlineLine(world);
  if (tip.kind === "busy" || tip.kind === "failed") return tip.reason;
  const sent = flushed.kind === "flushed" && flushed.sent > 0 ? [`sent ${flushed.sent}`] : [];
  if (tip.kind === "absent") return ["no record on origin yet", ...sent, ...outboxParts(world)].join(" · ");
  const copy = await refreshRecordCopy(world.git, world.commonDir, tip.sha);
  const copyResult = copy.ok ? "local copy refreshed" : `local copy not refreshed: ${copy.reason}`;
  return [`synced ${tip.sha.slice(0, 7)}`, copyResult, ...sent, ...outboxParts(world)].join(" · ");
}

function offlineLine(world: RecordWorld): string {
  return [`origin unreachable; ${copyPart(world)}`, ...outboxParts(world)].join(" · ");
}

function copyPart(world: RecordWorld): string {
  const now = world.deps.now();
  const copy = readRecordCopy(world.commonDir, now);
  return copy ? `local copy from ${ago(new Date(now.getTime() - copy.ageMs), now)} ago` : "no local copy";
}

function outboxParts(world: RecordWorld): string[] {
  const entries = listOutbox(world.outbox);
  const pending = entries.length === 0 ? "nothing queued" : `${entries.length} ${entries.length === 1 ? "change" : "changes"} not shared yet`;
  const refused = refusedFor(entries, ownSessionId(world.deps.env)).map((entry) => `#${entry.n} refused: ${entry.refused} (record drop ${entry.n})`);
  return [pending, ...refused];
}
