import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createExclusive, readIfPresent, removeIfUnchanged, tryLock } from "../claims/atomic-file";
import { stateDirIn } from "../core/git";
import { isPlainObject, parseDoc } from "./document";
import type { RecordPort } from "./ref";
import { writeRecord, type RecordPlan, type StoreWrite, type WriteOptions } from "./write";

export interface Intent {
  session: string | undefined;
  command: string;
  args: unknown;
}

export interface OutboxEntry extends Intent {
  n: number;
  queuedAt: string;
  refused?: string;
}

export type IntentRunners = Readonly<Record<string, (args: unknown) => RecordPlan>>;

export type RecordWrite = Exclude<StoreWrite, { kind: "offline" }> | { kind: "queued"; pending: number };

export type Flush = { kind: "flushed"; sent: number; refused: OutboxEntry[]; pending: number } | { kind: "offline" | "busy"; pending: number };

export const OUTBOX_LOCK = "flush.lock";
// Longer than a flush can take (each write: up to 5 attempts of a 10 s network call).
const CRASHED_LOCK_MS = 10 * 60_000;
const ENTRY = /^(\d+)\.json$/;

export function outboxDir(commonDir: string): string {
  return stateDirIn(commonDir, "outbox");
}

export async function sendIntent(port: RecordPort, dir: string, intent: Intent, runners: IntentRunners, options: WriteOptions, now: Date): Promise<RecordWrite> {
  const flushed = await flushOutbox(port, dir, runners, options);
  const runner = runners[intent.command];
  if (!runner) return { kind: "invalid", problems: [`no runner for ${intent.command} intents`] };
  const written = flushed.kind === "offline" ? { kind: "offline" as const } : await writeRecord(port, runner(intent.args), options);
  if (written.kind !== "offline") return written;
  queueIntent(dir, intent, now);
  return { kind: "queued", pending: listOutbox(dir).length };
}

export function queueIntent(dir: string, intent: Intent, now: Date): number {
  mkdirSync(dir, { recursive: true });
  const entry = (n: number): string => JSON.stringify({ n, ...intent, queuedAt: now.toISOString() });
  for (let n = nextNumber(dir); ; n += 1) {
    if (createExclusive(entryFile(dir, n), entry(n), intent.session ?? String(process.pid))) return n;
  }
}

export function listOutbox(dir: string): OutboxEntry[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => ENTRY.test(name))
    .map((name) => readEntry(join(dir, name)))
    .filter((entry): entry is OutboxEntry => entry !== undefined)
    .toSorted((a, b) => a.n - b.n);
}

export function dropEntry(dir: string, n: number): boolean {
  const file = entryFile(dir, n);
  const text = readIfPresent(file);
  return text !== undefined && removeIfUnchanged(file, text);
}

export function refusedFor(entries: readonly OutboxEntry[], session: string | undefined): OutboxEntry[] {
  return entries.filter((entry) => entry.refused !== undefined && entry.session === session);
}

export async function flushOutbox(port: RecordPort, dir: string, runners: IntentRunners, options: WriteOptions): Promise<Flush> {
  const waiting = listOutbox(dir).filter((entry) => entry.refused === undefined);
  if (waiting.length === 0) return { kind: "flushed", sent: 0, refused: [], pending: listOutbox(dir).length };
  const lock = join(dir, OUTBOX_LOCK);
  if (!takeLock(lock)) return { kind: "busy", pending: listOutbox(dir).length };
  try {
    return await flushUnderLock(port, dir, waiting, runners, options);
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

async function flushUnderLock(port: RecordPort, dir: string, waiting: readonly OutboxEntry[], runners: IntentRunners, options: WriteOptions): Promise<Flush> {
  let sent = 0;
  const refused: OutboxEntry[] = [];
  for (const entry of waiting) {
    const runner = runners[entry.command];
    const written = runner ? await writeRecord(port, runner(entry.args), options) : undefined;
    if (written?.kind === "offline") return { kind: "offline", pending: listOutbox(dir).length };
    if (written?.kind === "failed") break;
    if (written?.kind === "landed" || written?.kind === "unchanged") {
      rmSync(entryFile(dir, entry.n), { force: true });
      sent += 1;
      continue;
    }
    const marked = { ...entry, refused: written ? refusalOf(written) : `no runner for ${entry.command} intents in this plugin version` };
    rewriteEntry(dir, marked);
    refused.push(marked);
  }
  return { kind: "flushed", sent, refused, pending: listOutbox(dir).length };
}

function refusalOf(written: Exclude<StoreWrite, { kind: "landed" | "unchanged" | "offline" | "failed" }>): string {
  if (written.kind === "refused") return written.reason;
  if (written.kind === "invalid") return written.problems.join("; ");
  return `${written.path} changed since it was read`;
}

function takeLock(lock: string): boolean {
  if (tryLock(lock)) return true;
  if (!existsSync(lock) || Date.now() - statSync(lock).mtimeMs < CRASHED_LOCK_MS) return false;
  rmSync(lock, { recursive: true, force: true });
  return tryLock(lock);
}

function nextNumber(dir: string): number {
  const numbers = readdirSync(dir).flatMap((name) => {
    const match = ENTRY.exec(name);
    return match ? [Number(match[1])] : [];
  });
  return Math.max(0, ...numbers) + 1;
}

function entryFile(dir: string, n: number): string {
  return join(dir, `${n}.json`);
}

function readEntry(file: string): OutboxEntry | undefined {
  const data = parseDoc(readIfPresent(file) ?? "");
  if (!isPlainObject(data) || typeof data.n !== "number" || typeof data.command !== "string" || typeof data.queuedAt !== "string") return undefined;
  const session = typeof data.session === "string" ? data.session : undefined;
  const refused = typeof data.refused === "string" ? { refused: data.refused } : {};
  return { n: data.n, session, command: data.command, args: data.args, queuedAt: data.queuedAt, ...refused };
}

function rewriteEntry(dir: string, entry: OutboxEntry): void {
  const temp = join(dir, `${entry.n}.json.tmp-rewrite`);
  writeFileSync(temp, JSON.stringify(entry));
  renameSync(temp, entryFile(dir, entry.n));
}
