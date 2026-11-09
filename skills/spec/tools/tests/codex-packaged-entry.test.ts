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

function fixtureDaemon(threadId = "package-own") {
  const methods: string[] = [];
  const socket = join(tree.root, `${threadId}.sock`);
  const server = Bun.serve({ unix: socket,
    fetch(request, server) { return server.upgrade(request) ? undefined : new Response("bad handshake", { status: 400 }); },
    websocket: { message(ws, message) {
      const request = JSON.parse(String(message));
      methods.push(request.method);
      if (request.id === undefined) return;
      const result = request.method === "initialize" ? { userAgent: "codex/0.167.0" }
        : request.method === "thread/loaded/list" ? { data: [threadId], nextCursor: null }
          : { thread: { id: threadId, cwd: realpathSync(pilot.dir), updatedAt: 1794225600, status: { type: "idle" } } };
      ws.send(JSON.stringify({ id: request.id, result }));
    } },
  });
  stops.push(() => server.stop(true));
  const bin = join(tree.root, `bin-${threadId}`);
  mkdirSync(bin);
  const daemon = { status: "running", socketPath: socket, cliVersion: "0.167.0", appServerVersion: "0.167.0" };
  writeFileSync(join(bin, "codex"), `#!${process.execPath}\nif (Bun.argv.slice(2).join(' ') !== 'app-server daemon version') process.exit(99);\nconsole.log(${JSON.stringify(JSON.stringify(daemon))});\n`);
  chmodSync(join(bin, "codex"), 0o755);
  return { methods, env: { PATH: `${bin}:${process.env.PATH}`, CODEX_THREAD_ID: threadId } };
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

test("source fixture completes explicit recall/correction/local handoff and fresh-process pickup, without native acceptance", async () => {
  const native = fixtureDaemon();
  const spec = "docs/specs/checkout";
  pilot.write(`${spec}/phases/phase-2.md`, "**Goal:** Total.\n- [ ] implement total in `src/total.ts`\n");
  pilot.write(`${spec}/phases/phase-3.md`, "**Goal:** Native acceptance.\n- [ ] real model cycle\n");
  pilot.write(`${spec}/progress.md`, await Bun.file(join(pilot.dir, spec, "progress.md")).text() + "- [ ] Phase 3 — Native acceptance → `phases/phase-3.md`\n");
  pilot.write("docs/specs/_ledger/gotcha-total.md", "---\nkind: gotcha\npaths: [src/**]\ncreated: a\nseen-in: [checkout]\n---\n# Keep totals numeric\nDo not concatenate strings.\n");
  pilot.commitAll("fixture baseline");
  const baseline = pilot.git("rev-parse", "HEAD");
  const remote = legacy.git("--git-dir", legacy.origin, "rev-parse", "main");
  async function command(args: string[], mode = "execute") {
    const result = await cli([...options(mode), "--", ...args], native.env);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    return result.stdout;
  }
  const entry = await cli(options(), native.env);
  expect(entry.stdout).toContain("through the verified entry before edits");
  expect(entry.stdout).not.toContain("the edit hook");
  expect(await command(["lessons", "recall", "src/total.ts"])).toContain("Do not concatenate strings.");
  await implementFixtureTotal(command, spec);
  const handoff = await cli(options("handoff"), native.env);
  expect(handoff.stdout).toContain("Request: handoff checkout 2");
  expect(handoff.stdout).toContain("Ownership: not acquired");
  pilot.commitAll("[handoff] checkout: local fixture cycle");
  const committed = pilot.git("rev-parse", "HEAD");
  expect(committed).not.toBe(baseline);
  expect(pilot.git("status", "--porcelain")).toBe("");
  for (const args of [["claim", "take"], ["trees", "prune"], ["board"], ["push"], ["publish-docs"], ["launch"], ["crew"]]) {
    const refusal = await cli([...options("handoff"), "--", ...args], native.env);
    expect(refusal.code).toBe(1);
    expect(refusal.stdout).toContain("unavailable in local-pilot");
  }
  const fresh = fixtureDaemon("fresh-fixture");
  const pickup = await cli(options("resume"), fresh.env);
  expect(pickup.code).toBe(0);
  expect(pickup.stdout).toContain(`Candidate: ${root}`);
  expect(pickup.stdout).toContain(revision);
  expect(pickup.stdout).toContain("Initiating: codex/configured-local-daemon/fresh-fixture");
  expect(pickup.stdout).toContain("Run actual installed candidate model acceptance");
  expect(pickup.stdout).toContain("gotcha-local-total.md");
  expect(pickup.stdout).toContain("| 2 — Aggregate | ✅ done |");
  expect(pilot.git("rev-parse", "HEAD")).toBe(committed);
  expect(legacy.git("--git-dir", legacy.origin, "rev-parse", "main")).toBe(remote);
  expect(existsSync(join(pilot.dir, ".git/spec-board/claims"))).toBe(false);
  expect([...native.methods, ...fresh.methods].every((method) => ["initialize", "initialized", "thread/loaded/list", "thread/read"].includes(method))).toBe(true);
});

async function implementFixtureTotal(command: (args: string[], mode?: string) => Promise<string>, spec: string) {
  pilot.write("src/total.ts", "export const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);\n");
  const check = Bun.spawnSync([process.execPath, "-e", 'import { total } from "./src/total"; if (total([2, 3]) !== 5 || total([]) !== 0) process.exit(1);'], { cwd: pilot.dir });
  expect(check.exitCode).toBe(0);
  pilot.write(`${spec}/ledger/gotcha-local-total.md`, "# invalid edit\n");
  expect(await command(["doctor", "checkout", "--file", "ledger/gotcha-local-total.md"])).toContain("ledger entry has no frontmatter");
  pilot.write(`${spec}/ledger/gotcha-local-total.md`, "---\nkind: gotcha\napplies-to: [phase 2]\ncreated: a\n---\n# Keep totals numeric\nValidated the real fixture code. Native acceptance remains pending.\n");
  pilot.write(`${spec}/ledger/INDEX.md`, await Bun.file(join(pilot.dir, spec, "ledger/INDEX.md")).text() + "- `gotcha-local-total.md` — [phase 2] — keep totals numeric\n");
  expect(await command(["doctor", "checkout", "--file", "ledger/gotcha-local-total.md"])).toContain("doctor: clean (1 file)");
  expect(await command(["phase", "tick", "checkout", "2", "implement total"], "update")).toContain("Phase 2 complete");
  expect(await Bun.file(join(pilot.dir, spec, "progress.md")).text()).toContain("- [x] Phase 2");
  pilot.write(`${spec}/in-flight/phase-2.md`, "# In-flight state\n\n## Where things stand\n\nLocal fixture implementation complete; read ledger/gotcha-local-total.md.\n\n## Pick up from here\n\nRun actual installed candidate model acceptance; this socket cycle is source evidence only.\n");
  for (const file of ["phases/phase-2.md", "progress.md", "ledger/INDEX.md", "in-flight/phase-2.md"]) {
    expect(await command(["doctor", "checkout", "--file", file], "handoff")).toContain("doctor: clean (1 file)");
  }
  expect(await command(["doctor", "checkout"], "handoff")).toContain("doctor: clean (1 spec)");
}
