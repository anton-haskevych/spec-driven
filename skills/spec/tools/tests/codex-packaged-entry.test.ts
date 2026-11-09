import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, cpSync, existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inspectCandidate } from "../runtime/codex/candidate";
import { createContextFixture } from "./context-fixture";
import { repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { createTree, type Tree } from "./tree";

let tree: Tree;
let legacy: TestRepo;
let pilot: WorkingCopy;
let root: string;
let revision: string;
let version: string;
const stops: (() => void)[] = [];

beforeEach(() => {
  tree = createTree("pkg-entry-");
  root = join(tree.root, "candidate");
  mkdirSync(root);
  root = realpathSync(root);
  for (const path of ["skills", "agents", "scripts", ".codex-plugin", ".claude-plugin"]) cpSync(join(import.meta.dir, "../../../..", path), join(root, path), { recursive: true });
  const assets = inspectCandidate(root);
  if (!assets.ok) throw new Error(assets.reason);
  revision = assets.value.revision;
  version = assets.value.version;
  legacy = repoWithOrigin("pkg-legacy-");
  pilot = legacy.clone("pilot");
  const fixture = createContextFixture();
  cpSync(join(fixture.project, "docs"), join(pilot.dir, "docs"), { recursive: true });
  fixture.cleanup();
});
afterEach(() => { stops.splice(0).forEach((stop) => stop()); legacy?.cleanup(); tree?.cleanup(); });

async function cli(args: string[], extraEnv: Record<string, string> = {}) {
  const child = Bun.spawn([process.execPath, join(root, "skills/spec/tools/codex.ts"), ...args], {
    cwd: realpathSync(pilot.dir), stdout: "pipe", stderr: "pipe", timeout: 5000,
    env: { ...process.env, CODEX_THREAD_ID: "package-own", CLAUDE_CODE_SESSION_ID: "", CODEX_HOME: "",
      GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", ...extraEnv },
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
}

function options(mode = "execute"): string[] {
  return ["--request", `${mode} checkout 2`, "--revision", revision, "--legacy-project", legacy.dir];
}

function fixtureDaemon() {
  const methods: string[] = [];
  const socket = join(tree.root, "rpc.sock");
  const server = Bun.serve({ unix: socket,
    fetch(request, server) { return server.upgrade(request) ? undefined : new Response("bad handshake", { status: 400 }); },
    websocket: { message(ws, message) {
      const request = JSON.parse(String(message));
      methods.push(request.method);
      if (request.id === undefined) return;
      const result = request.method === "initialize" ? { userAgent: "codex/0.167.0" }
        : request.method === "thread/loaded/list" ? { data: ["package-own"], nextCursor: null }
          : { thread: { id: "package-own", cwd: realpathSync(pilot.dir), updatedAt: 1794225600, status: { type: "idle" } } };
      ws.send(JSON.stringify({ id: request.id, result }));
    } },
  });
  stops.push(() => server.stop(true));
  const bin = join(tree.root, "bin");
  mkdirSync(bin);
  const daemon = { status: "running", socketPath: socket, cliVersion: "0.167.0", appServerVersion: "0.167.0" };
  writeFileSync(join(bin, "codex"), `#!${process.execPath}\nif (Bun.argv.slice(2).join(' ') !== 'app-server daemon version') process.exit(99);\nconsole.log(${JSON.stringify(JSON.stringify(daemon))});\n`);
  chmodSync(join(bin, "codex"), 0o755);
  return { methods, env: { PATH: `${bin}:${process.env.PATH}` } };
}

test("actual copied candidate CLI reaches stored context through a disposable read-only daemon fixture", async () => {
  const native = fixtureDaemon();
  const result = await cli(options(), native.env);
  expect(result.code).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toContain(`Candidate: ${root}`);
  expect(result.stdout).toContain(revision);
  expect(result.stdout).toContain("Request: execute checkout 2");
  expect(result.stdout).toContain("Picked: Phase 2");
  expect(native.methods).toEqual(["initialize", "initialized", "thread/loaded/list", "thread/read"]);
  expect(existsSync(join(root, ".git"))).toBe(false);
  expect(existsSync(join(root, "node_modules"))).toBe(false);
  expect(existsSync(join(pilot.dir, ".git/spec-board/claims"))).toBe(false);
});

test("packaged entry rejects stale content, missing identity and outward actions without daemon calls", async () => {
  const native = fixtureDaemon();
  const outward = await cli([...options(), "--", "push"], native.env);
  expect(outward.code).toBe(1);
  expect(outward.stdout).toContain("unavailable in local-pilot");
  const missing = await cli(options(), { ...native.env, CODEX_THREAD_ID: "" });
  expect(missing.code).toBe(1);
  expect(missing.stdout).toContain("identity unavailable");
  writeFileSync(join(root, "skills/spec/status.md"), "Changed canonical asset\n");
  const changed = await cli(options(), native.env);
  expect(changed.code).toBe(1);
  expect(changed.stdout).toContain("candidate revision differs");
  expect(native.methods).toEqual([]);
});

test("asset inspection has no native reads and shared modes route through the capability contract", async () => {
  const native = fixtureDaemon();
  const result = await cli(["--assets"], native.env);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ root, version, revision });
  expect(native.methods).toEqual([]);
  for (const file of ["SKILL.md", "execute.md", "handoff.md", "update.md"]) {
    expect(await Bun.file(join(root, "skills/spec", file)).text()).toContain("capabilities.md");
  }
  expect(await Bun.file(join(root, "skills/spec/SKILL.md")).text()).toContain("native-entry.md");
});
