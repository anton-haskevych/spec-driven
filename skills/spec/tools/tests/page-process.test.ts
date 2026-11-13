import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { pageCommand, type PageDeps } from "../commands/page";
import { clearPageState, ensurePageServer, mainCheckoutOf, pagePort, PORT_BASE, readPageState, writePageState, type Health, type ProcessDeps } from "../page/process";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin } from "./git-repo";
import { createTree } from "./tree";

const NOT_RUNNING = 99_999_999;

describe("one page server per clone", () => {
  const tree = createTree("spec-page-process-");
  const stateDir = join(tree.root, "page");
  let servers: Map<number, Health>;
  let spawned: (readonly string[])[];
  let stopped: number[];
  afterAll(() => tree.cleanup());
  beforeEach(() => {
    clearPageState(stateDir, readPageState(stateDir)?.pid ?? 0);
    [servers, spawned, stopped] = [new Map(), [], []];
  });

  const deps = (childPid: number | undefined = process.pid, version = "2.58.0"): ProcessDeps => ({
    spawner: (argv) => {
      spawned.push(argv);
      if (childPid !== undefined) {
        servers.set(41_701, { pid: childPid, version });
        writePageState(stateDir, { pid: childPid, port: 41_701, version });
      }
      return childPid;
    },
    health: async (port) => servers.get(port),
    stop: (pid) => stopped.push(pid),
    pause: async () => {},
  });
  const request = { stateDir, cwd: tree.root, version: "2.58.0", argv: ["bun", "spec.ts", "page", "--serve"] };

  test("starts one detached and waits until it answers", async () => {
    expect(await ensurePageServer(request, deps())).toEqual({ kind: "started", state: { pid: process.pid, port: 41_701, version: "2.58.0" } });
    expect(spawned).toEqual([request.argv]);
  });

  test("reuses a live one of this version", async () => {
    writePageState(stateDir, { pid: process.pid, port: 41_702, version: "2.58.0" });
    servers.set(41_702, { pid: process.pid, version: "2.58.0" });
    expect((await ensurePageServer(request, deps())).kind).toBe("reused");
    expect(spawned).toEqual([]);
  });

  test("replaces one an older plugin started", async () => {
    writePageState(stateDir, { pid: process.pid, port: 41_702, version: "2.57.0" });
    servers.set(41_702, { pid: process.pid, version: "2.57.0" });
    expect((await ensurePageServer(request, deps())).kind).toBe("replaced");
    expect(stopped).toEqual([process.pid]);
  });

  test("a state file whose process is gone is started over; a child that never answers is a failure", async () => {
    writePageState(stateDir, { pid: NOT_RUNNING, port: 41_702, version: "2.58.0" });
    expect((await ensurePageServer(request, deps())).kind).toBe("started");
    clearPageState(stateDir, process.pid);
    const silent = { ...deps(), spawner: () => 12_345 };
    expect(await ensurePageServer(request, silent)).toEqual({ kind: "failed", reason: `the page server didn't answer within 15 s; see ${join(stateDir, "server.log")}` });
  });

  test("only the server that wrote the state file removes it", () => {
    writePageState(stateDir, { pid: 7, port: 1, version: "x" });
    clearPageState(stateDir, 8);
    expect(readPageState(stateDir)?.pid).toBe(7);
    clearPageState(stateDir, 7);
    expect(existsSync(join(stateDir, "running.json"))).toBe(false);
  });

  test("the port follows the clone; the server runs from the main checkout", () => {
    expect(pagePort("/Users/a/crm/.git")).toBe(pagePort("/Users/a/crm/.git"));
    expect(pagePort("/Users/a/crm/.git")).not.toBe(pagePort("/Users/a/other/.git"));
    expect(pagePort("/x/.git")).toBeGreaterThanOrEqual(PORT_BASE);
    expect(mainCheckoutOf("/Users/a/crm/.git", "/tree")).toBe("/Users/a/crm");
    expect(mainCheckoutOf("/srv/crm.git", "/tree")).toBe("/tree");
  });
});

describe("spec.ts page", () => {
  const repo = repoWithOrigin("spec-page-command-");
  afterAll(() => repo.cleanup());
  const opened: string[] = [];
  const deps = (env: Record<string, string> = {}): PageDeps => ({
    runner: isolatedRunner,
    asyncRunner: isolatedAsyncRunner,
    claudeHome: join(repo.root, "claude"),
    env,
    now: () => new Date("2026-11-13T20:00:00Z"),
    process: {
      spawner: (argv) => {
        const port = Number(argv.at(-1));
        writePageState(join(realpathSync(repo.dir), ".git", "spec-board", "page"), { pid: process.pid, port, version: "2.58.0" });
        return process.pid;
      },
      health: async () => ({ pid: process.pid, version: "2.58.0" }),
      stop: () => {},
      pause: async () => {},
    },
    openBrowser: (url) => opened.push(url),
    version: "2.58.0",
    toolsDir: "/tools",
  });

  test("starts the server on the clone's port, opens the card's link and says so", async () => {
    const line = await pageCommand(repo.dir, ["c90"], deps());
    expect(line).toMatch(/^page: http:\/\/127\.0\.0\.1:4\d{4}\/#c90 \(started\)$/);
    expect(opened).toEqual([line.slice("page: ".length, line.indexOf(" ("))]);
    expect(await pageCommand(repo.dir, [], deps())).toEndWith("/ (already running)");
  });

  test("a background session opens no page; bad arguments get the usage", async () => {
    expect(await pageCommand(repo.dir, [], deps({ CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF: "1" }))).toBe("page: a background session doesn't open pages; `page --json` prints the model");
    expect(await pageCommand(repo.dir, ["90"], deps())).toBe("usage: page [<card-id>] [--json]");
    expect(await pageCommand(repo.dir, ["--nope"], deps())).toBe("usage: page [<card-id>] [--json]");
  });
});
