import { afterAll, describe, expect, test } from "bun:test";
import type { HeldClaim } from "../claims/rules";
import { closeOutLine } from "../crew/close-out";
import { closeOut, type CloseOutWorld } from "../crew/close-out-run";
import type { LaunchedEntry } from "../crew/run-state";
import type { RunResult } from "../core/run";
import type { Agent } from "../sessions/agents";
import { strictRunner } from "./stub-runner";
import { createTree } from "./tree";

const LAUNCHED_AT = new Date(Date.now() - 60 * 60_000).toISOString();
const TREE = "/trees/oversee-pr-b";
const BRANCH = "feat/x-pr-b";
const HEAD = "aaaa111";
const CREW = "Crew: needs you 0 (in-flight.md) · say if wrong 1 · PR group ready B · next nothing · servers stopped none";

const claude = createTree("spec-close-out-run-claude-");
afterAll(() => claude.cleanup());

const worker: LaunchedEntry = { id: "w1", title: "x execute 4", at: LAUNCHED_AT };
const agent: Agent = { id: "w1", sessionId: "sess-w1", cwd: TREE, kind: "background", state: "done" };
const closedClaim: HeldClaim = { claim: { spec: "x", phase: "4", sessionId: "sess-w1", workspace: TREE, branch: BRANCH, claimedAt: LAUNCHED_AT }, status: "closed" };

function transcript(sessionId: string, text: string): void {
  const line = (type: string, content: unknown) => JSON.stringify({ type, message: { content } });
  claude.write(`projects/repo/${sessionId}.jsonl`, [line("user", "go"), line("assistant", [{ type: "text", text }])].join("\n"));
}

type Answers = Partial<Record<"status" | "fetch" | "head" | "remote" | "handoff", Partial<RunResult>>>;

function perGroupGit(answers: Answers = {}) {
  return strictRunner([
    [["git", "status", "--porcelain"], answers.status ?? { stdout: "" }],
    [["git", "fetch", "-q", "origin", BRANCH], answers.fetch ?? {}],
    [["git", "rev-parse", "HEAD"], answers.head ?? { stdout: `${HEAD}\n` }],
    [["git", "rev-parse", `origin/${BRANCH}`], answers.remote ?? { stdout: `${HEAD}\n` }],
    [["git", "log", `origin/${BRANCH}`, `--since=${LAUNCHED_AT}`, "--grep=^\\[handoff\\]", "--format=%H", "-1"], answers.handoff ?? { stdout: "bbbb222\n" }],
  ]);
}

const world = (runner: CloseOutWorld["runner"], extra: Partial<CloseOutWorld> = {}): CloseOutWorld => ({ agents: [agent], claims: [closedClaim], claudeHome: claude.root, runner, ...extra });

describe("closeOut, per-group (today's checks)", () => {
  transcript("sess-w1", `Handed off.\n${CREW}`);

  test("clean, pushed, handed off, Crew line in the last turn: ok, with the exact git reads", () => {
    const git = perGroupGit();
    expect(closeOutLine(closeOut(worker, world(git)) ?? { kind: "missing", missing: [] })).toBe(`Close-out: ok · ${CREW}`);
    expect(git.calls).toEqual([
      ["git", "status", "--porcelain"],
      ["git", "fetch", "-q", "origin", BRANCH],
      ["git", "rev-parse", "HEAD"],
      ["git", "rev-parse", `origin/${BRANCH}`],
      ["git", "log", `origin/${BRANCH}`, `--since=${LAUNCHED_AT}`, "--grep=^\\[handoff\\]", "--format=%H", "-1"],
    ]);
  });

  test("HEAD past origin and no handoff commit: both named", () => {
    const git = perGroupGit({ head: { stdout: "cccc333\n" }, handoff: { stdout: "" } });
    expect(closeOutLine(closeOut(worker, world(git)) ?? { kind: "missing", missing: [] })).toBe("Close-out: missing commits not on origin, no [handoff] commit since launch");
  });

  test("a failed fetch counts as not pushed", () => {
    const git = perGroupGit({ fetch: { code: 1, stderr: "offline" } });
    expect(closeOutLine(closeOut(worker, world(git)) ?? { kind: "missing", missing: [] })).toBe("Close-out: missing commits not on origin");
  });

  test("no Crew line in the last turn: missing, never read from a commit outside spec-branch mode", () => {
    const quiet: LaunchedEntry = { ...worker, id: "w2" };
    transcript("sess-w2", "Handed off.");
    const git = perGroupGit();
    const verdict = closeOut(quiet, world(git, { agents: [{ ...agent, id: "w2", sessionId: "sess-w2" }] }));
    expect(closeOutLine(verdict ?? { kind: "missing", missing: [] })).toBe("Close-out: missing no Crew: line");
  });

  test("a gone session with no claim has no tree: nothing is run", () => {
    const git = perGroupGit();
    expect(closeOutLine(closeOut(worker, world(git, { agents: [], claims: [] })) ?? { kind: "missing", missing: [] })).toBe("Close-out: missing its tree (session gone, no claim)");
    expect(git.calls).toEqual([]);
  });

  test("a babysitter of group default is matched to its pr-default claim", () => {
    const sitter: LaunchedEntry = { id: "b1", title: "x babysit default", at: LAUNCHED_AT };
    const prClaim: HeldClaim = { claim: { spec: "x", phase: "pr-default", sessionId: "sess-b1", workspace: "/trees/x", claimedAt: LAUNCHED_AT }, status: "live" };
    const verdict = closeOut(sitter, world(perGroupGit(), { agents: [], claims: [prClaim] }));
    expect(closeOutLine(verdict ?? { kind: "missing", missing: [] })).toBe("Close-out: waiting (pr-default claim live)");
  });
});
