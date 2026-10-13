import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchCommand } from "../commands/launch";
import { parseBackgrounded } from "../launch/background";
import type { RunOptions, RunResult, Runner } from "../core/run";
import type { Placement } from "../trees/place";

const FIXTURE = readFileSync(join(import.meta.dir, "fixtures", "claude-bg-stdout.txt"), "utf8");

function recordingRunner(reply: Partial<RunResult>): Runner & { calls: { argv: readonly string[]; options?: RunOptions }[] } {
  const calls: { argv: readonly string[]; options?: RunOptions }[] = [];
  return { calls, run: (argv, options) => (calls.push({ argv, options }), { code: 0, stdout: "", stderr: "", ...reply }) };
}

const dirs: string[] = [];
function briefFile(text = "You are a crew worker.\n"): string {
  const dir = mkdtempSync(join(tmpdir(), "launch-bg-"));
  dirs.push(dir);
  const path = join(dir, "brief.md");
  writeFileSync(path, text);
  return path;
}
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const fresh: Placement = {
  kind: "added", path: "/trees/spec-board-pr-b", branch: "feat/spec-board-pr-b", how: "created",
  setup: { copied: [".env"], failed: "copy .env.local: no such file" }, bootstrap: "fresh-tree",
};
const found: Placement = { kind: "found", branch: "feat/spec-board-pr-b", path: "/trees/spec-board-pr-b" };

describe("parseBackgrounded", () => {
  test("reads the id and name from claude --bg output, after the service-start line too", () => {
    expect(parseBackgrounded(FIXTURE)).toEqual({ id: "8b25966f", name: "crew-probe-ctl" });
    expect(parseBackgrounded(FIXTURE.split("\n").slice(1).join("\n"))).toEqual({ id: "8b25966f", name: "crew-probe-ctl" });
  });

  test("output without the backgrounded line has no session", () => {
    expect(parseBackgrounded("Workspace not trusted.\n")).toBeUndefined();
  });
});

describe("launch --bg --brief", () => {
  test("execute places the tree, adds its fresh-tree lines to the brief and starts claude --bg there", async () => {
    const brief = briefFile();
    const runner = recordingRunner({ stdout: FIXTURE });
    const report = await launchCommand("/w", ["execute", "spec-board", "6", "--bg", "--brief", brief], async () => ({ ok: true, value: fresh }), {}, runner);

    expect(report.split("\n").at(-1)).toBe("Launched: background 8b25966f · spec-board execute 6");
    expect(report).toStartWith("Tree: /trees/spec-board-pr-b · feat/spec-board-pr-b · new branch from origin\n");
    expect(runner.calls).toEqual([{
      argv: ["claude", "--bg", "-n", "spec-board execute 6", "--permission-mode", "bypassPermissions", "--append-system-prompt-file", brief, "/spec-driven:spec execute spec-board 6"],
      options: { cwd: "/trees/spec-board-pr-b", env: { CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF: "1" } },
    }]);
    expect(readFileSync(brief, "utf8")).toBe([
      "You are a crew worker.",
      "",
      "Setup failed: copy .env.local: no such file. The tree is kept; fix it there.",
      "Fresh tree: work through gate fresh-tree (spec.ts gates --name fresh-tree) before coding.",
      "",
    ].join("\n"));
  });

  test("an existing tree leaves the brief as it was", async () => {
    const brief = briefFile();
    await launchCommand("/w", ["execute", "spec-board", "6", "--bg", "--brief", brief], async () => ({ ok: true, value: found }), {}, recordingRunner({ stdout: FIXTURE }));
    expect(readFileSync(brief, "utf8")).toBe("You are a crew worker.\n");
  });

  test("babysit hold carries hold into the background prompt", async () => {
    const runner = recordingRunner({ stdout: FIXTURE });
    const report = await launchCommand("/w", ["babysit", "spec-board", "B", "hold", "--bg", "--brief", briefFile()], async () => ({ ok: true, value: found }), {}, runner);
    expect(report.split("\n").at(-1)).toBe("Launched: background 8b25966f · spec-board babysit B");
    expect(runner.calls[0]?.argv.at(-1)).toBe("/spec-driven:spec babysit spec-board B hold");
    expect(runner.calls[0]?.argv[3]).toBe("spec-board babysit B");
  });

  test("a refused claude --bg comes back with its first stderr line", async () => {
    const runner = recordingRunner({ code: 1, stderr: "Workspace not trusted. Run `claude` in /trees/x once.\nmore\n" });
    const report = await launchCommand("/w", ["execute", "spec-board", "6", "--bg", "--brief", briefFile()], async () => ({ ok: true, value: found }), {}, runner);
    expect(report.split("\n").at(-1)).toBe("launch: claude --bg failed: Workspace not trusted. Run `claude` in /trees/x once.");
  });

  test("output with no session id is reported, not guessed", async () => {
    const report = await launchCommand("/w", ["execute", "spec-board", "6", "--bg", "--brief", briefFile()], async () => ({ ok: true, value: found }), {}, recordingRunner({ stdout: "something else\n" }));
    expect(report.split("\n").at(-1)).toBe("launch: claude --bg printed no session id: something else");
  });

  test("bad flags never place a tree", async () => {
    const place = async () => { throw new Error("must not place"); };
    const run = (args: string[]) => launchCommand("/w", args, place, {}, recordingRunner({}));
    expect(await run(["execute", "spec-board", "6", "--bg"])).toBe("launch: --bg and --brief <file> go together");
    expect(await run(["execute", "spec-board", "6", "--brief", "/b.md"])).toBe("launch: --bg and --brief <file> go together");
    expect(await run(["execute", "spec-board", "--bg", "--brief", "/b.md"])).toBe("launch: --bg needs a phase or PR group");
    expect(await run(["execute", "spec-board", "6", "--bg", "--brief", "/nope/brief.md"])).toBe("launch: no brief file /nope/brief.md");
    expect(await run(["execute", "spec-board", "6", "--sideways"])).toStartWith("launch: usage: ");
  });
});
