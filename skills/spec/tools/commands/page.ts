import { parseArgs } from "node:util";
import { join } from "node:path";
import type { BoardRunners } from "../board/load";
import type { Env } from "../core/env";
import { gitAt, gitCommonDir, stateDirIn } from "../core/git";
import { systemAsyncRunner, systemRunner } from "../core/run";
import { loadPageModel } from "../page/load";
import { ensurePageServer, mainCheckoutOf, pagePort, pluginVersion, type ProcessDeps } from "../page/process";
import { servePage } from "../page/serve";
import { defaultClaudeHome } from "../sessions/live";
import { detachedSpawner } from "../trees/prune-background";

export const PAGE_USAGE = "page [<card-id>] [--json]";

const CARD = /^c[1-9]\d*$/;
// Set on every session the overseer starts with `claude --bg`: nobody is at that screen to look at a page.
const BACKGROUND_SESSION = "CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF";

export interface PageDeps extends BoardRunners {
  env: Env;
  now: () => Date;
  process: ProcessDeps;
  openBrowser(url: string): void;
  version: string;
  toolsDir: string;
}

export function systemPageDeps(): PageDeps {
  const toolsDir = join(import.meta.dir, "..");
  return {
    runner: systemRunner,
    asyncRunner: systemAsyncRunner,
    claudeHome: defaultClaudeHome(),
    env: process.env,
    now: () => new Date(),
    process: { spawner: detachedSpawner, health, stop: (pid) => process.kill(pid, "SIGTERM"), pause: (ms) => Bun.sleep(ms) },
    openBrowser: (url) => void Bun.spawn(process.platform === "darwin" ? ["open", url] : ["xdg-open", url], { stdio: ["ignore", "ignore", "ignore"] }),
    version: pluginVersion(toolsDir),
    toolsDir,
  };
}

export async function pageCommand(projectDir: string, args: readonly string[], deps: PageDeps = systemPageDeps()): Promise<string> {
  const parsed = parsePageArgs(args);
  if (typeof parsed === "string") return parsed;
  if (parsed.serve) return servePage(projectDir, parsed.port ?? 0, deps.version);
  if (parsed.json) return jsonModel(projectDir, parsed.card, deps);
  if (deps.env[BACKGROUND_SESSION] === "1") return "page: a background session doesn't open pages; `page --json` prints the model";
  const common = gitCommonDir(gitAt(projectDir, deps.runner));
  if (!common.ok) return `page: ${common.reason}`;
  const port = pagePort(common.value);
  const started = await ensurePageServer(
    {
      stateDir: stateDirIn(common.value, "page"),
      cwd: mainCheckoutOf(common.value, projectDir),
      version: deps.version,
      argv: [process.execPath, join(deps.toolsDir, "spec.ts"), "page", "--serve", "--port", String(port)],
    },
    deps.process,
  );
  if (started.kind === "failed") return `page: ${started.reason}`;
  const url = `http://127.0.0.1:${started.state.port}/${parsed.card ? `#${parsed.card}` : ""}`;
  deps.openBrowser(url);
  const how = { reused: "already running", started: "started", replaced: `restarted on ${deps.version}` }[started.kind];
  return `page: ${url} (${how})`;
}

async function jsonModel(projectDir: string, card: string | undefined, deps: PageDeps): Promise<string> {
  const loaded = await loadPageModel(projectDir, deps, deps.now());
  if (!loaded.ok) return JSON.stringify({ page: null, error: loaded.reason });
  if (!card) return JSON.stringify({ page: loaded.value }, null, 2);
  const found = loaded.value.cards.find((each) => each.id === card);
  return JSON.stringify(found ? { card: found } : { card: null, error: `no card ${card} on the board` }, null, 2);
}

interface PageArgs {
  card?: string;
  json: boolean;
  serve: boolean;
  port?: number;
}

function parsePageArgs(args: readonly string[]): PageArgs | string {
  try {
    const { values, positionals } = parseArgs({
      args: [...args],
      options: { json: { type: "boolean", default: false }, serve: { type: "boolean", default: false }, port: { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
    const [card, ...rest] = positionals;
    if (rest.length > 0 || (card !== undefined && !CARD.test(card))) return `usage: ${PAGE_USAGE}`;
    const port = values.port === undefined ? undefined : Number(values.port);
    if (port !== undefined && !Number.isInteger(port)) return `usage: ${PAGE_USAGE}`;
    return { ...(card ? { card } : {}), json: values.json, serve: values.serve, ...(port !== undefined ? { port } : {}) };
  } catch {
    return `usage: ${PAGE_USAGE}`;
  }
}

async function health(port: number): Promise<{ pid: number; version: string } | undefined> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1_000) });
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return undefined;
    const { pid, version } = body as Record<string, unknown>;
    return typeof pid === "number" && typeof version === "string" ? { pid, version } : undefined;
  } catch {
    return undefined;
  }
}
