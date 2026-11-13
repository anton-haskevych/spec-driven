import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { isAlive, readText } from "../core/pid-file";
import type { Spawner } from "../trees/prune-background";

export interface PageState {
  pid: number;
  port: number;
  version: string;
}

export interface Health {
  pid: number;
  version: string;
}

export interface ProcessDeps {
  spawner: Spawner;
  health(port: number): Promise<Health | undefined>;
  stop(pid: number): void;
  pause(ms: number): Promise<void>;
}

export interface StartRequest {
  stateDir: string;
  // Where the server runs: the main checkout, which no prune removes from under it.
  cwd: string;
  version: string;
  argv: readonly string[];
}

export type Started = { kind: "reused" | "started" | "replaced"; state: PageState } | { kind: "failed"; reason: string };

export const PORT_BASE = 41_700;
const PORT_SPAN = 200;
const START_WAIT_MS = 15_000;
const POLL_MS = 150;

// The same clone gets the same port, so a link Claude handed out still opens after a restart.
export function pagePort(commonDir: string): number {
  let hash = 2_166_136_261;
  for (const char of commonDir) hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619) >>> 0;
  return PORT_BASE + (hash % PORT_SPAN);
}

export function mainCheckoutOf(commonDir: string, fallback: string): string {
  return basename(commonDir) === ".git" ? dirname(commonDir) : fallback;
}

export function pluginVersion(toolsDir: string): string {
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(toolsDir, "..", "..", "..", ".claude-plugin", "plugin.json"), "utf8"));
    return typeof manifest === "object" && manifest !== null && "version" in manifest && typeof manifest.version === "string" ? manifest.version : "unknown";
  } catch {
    return "unknown";
  }
}

const stateFile = (dir: string) => join(dir, "running.json");

export function readPageState(dir: string): PageState | undefined {
  try {
    const value: unknown = JSON.parse(readText(stateFile(dir)) ?? "");
    if (typeof value !== "object" || value === null) return undefined;
    const { pid, port, version } = value as Record<string, unknown>;
    return typeof pid === "number" && typeof port === "number" && typeof version === "string" ? { pid, port, version } : undefined;
  } catch {
    return undefined;
  }
}

export function writePageState(dir: string, state: PageState): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${stateFile(dir)}.tmp`, JSON.stringify(state));
  renameSync(`${stateFile(dir)}.tmp`, stateFile(dir));
}

// Only the server that wrote the file removes it: a newer one may already have replaced it.
export function clearPageState(dir: string, pid: number): void {
  if (readPageState(dir)?.pid === pid) rmSync(stateFile(dir), { force: true });
}

export async function ensurePageServer(request: StartRequest, deps: ProcessDeps): Promise<Started> {
  const running = await liveServer(request.stateDir, deps);
  if (running && running.version === request.version) return { kind: "reused", state: running };
  if (running) {
    deps.stop(running.pid);
    await waitFor(async () => (isAlive(running.pid) ? undefined : true), deps);
  }
  mkdirSync(request.stateDir, { recursive: true });
  const log = join(request.stateDir, "server.log");
  const pid = deps.spawner(request.argv, { cwd: request.cwd, logFile: log });
  if (pid === undefined) return { kind: "failed", reason: "could not start the page server" };
  const state = await waitFor(async () => {
    const written = readPageState(request.stateDir);
    return written?.pid === pid && (await deps.health(written.port))?.pid === pid ? written : undefined;
  }, deps);
  if (!state) return { kind: "failed", reason: `the page server didn't answer within ${START_WAIT_MS / 1000} s; see ${log}` };
  return { kind: running ? "replaced" : "started", state };
}

async function liveServer(dir: string, deps: ProcessDeps): Promise<PageState | undefined> {
  const state = readPageState(dir);
  if (!state || !isAlive(state.pid)) return undefined;
  const health = await deps.health(state.port);
  return health?.pid === state.pid ? { ...state, version: health.version } : undefined;
}

async function waitFor<T>(check: () => Promise<T | undefined>, deps: ProcessDeps): Promise<T | undefined> {
  for (let waited = 0; waited < START_WAIT_MS; waited += POLL_MS) {
    const value = await check();
    if (value !== undefined) return value;
    await deps.pause(POLL_MS);
  }
  return undefined;
}
