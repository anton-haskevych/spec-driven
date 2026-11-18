import { afterAll, describe, expect, test } from "bun:test";
import type { HeldClaim } from "../claims/rules";
import { closeOutLine } from "../crew/close-out";
import { closeOut, type CloseOutWorld } from "../crew/close-out-run";
import type { LaunchedEntry } from "../crew/run-state";
import type { RunResult } from "../core/run";
import type { PhaseState } from "../core/spec-state";
import { specLayout } from "../pr/groups";
import type { Agent } from "../sessions/agents";
import { phaseEdges, phaseState } from "./factories";
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

describe("closeOut, a lane worker in spec-branch mode", () => {
  const RECORDED = "dddd444";
  const HANDOFF_LOG = ["git", "log", `origin/${BRANCH}`, `--since=${LAUNCHED_AT}`, "--grep=^\\[handoff\\] x", "--format=%B", "-1"];
  const layouts = new Map([["x", specLayout({ spec: { name: "x", dir: "/specs/x" }, hasProgress: true, phases: [lanePhase("4", "B"), lanePhase("5", "S")] }, { cutFrom: "c0ffee1", shipAlone: ["S"] })]]);
  const tasks = (evidence: string | undefined): CloseOutWorld["phaseTasks"] => () => [{ id: "4.1", text: "a", done: true, ...(evidence ? { evidence } : {}) }];
  const laneWorld = (runner: CloseOutWorld["runner"], evidence: string | undefined = `${RECORDED} on origin/${BRANCH}`, extra: Partial<CloseOutWorld> = {}) => world(runner, { layouts, phaseTasks: tasks(evidence), ...extra });

  function laneGit(answers: Partial<Record<"fetch" | "ancestor" | "handoff", Partial<RunResult>>> = {}) {
    return strictRunner([
      [["git", "status", "--porcelain"], { stdout: "" }],
      [["git", "fetch", "-q", "origin", BRANCH, "feat/x"], answers.fetch ?? {}],
      [["git", "merge-base", "--is-ancestor", RECORDED, "origin/feat/x"], answers.ancestor ?? {}],
      [HANDOFF_LOG, answers.handoff ?? { stdout: `[handoff] x: phase 4\n\n${CREW}\n` }],
    ]);
  }

  test("the recorded commit is in feat/<spec>: ok, whatever HEAD is (the docs snapshot moves it), and marked a lane", () => {
    const git = laneGit();
    const verdict = closeOut(worker, laneWorld(git));
    expect(verdict).toMatchObject({ kind: "ok", report: CREW, lane: true });
    expect(git.calls).toEqual([["git", "status", "--porcelain"], ["git", "fetch", "-q", "origin", BRANCH, "feat/x"], ["git", "merge-base", "--is-ancestor", RECORDED, "origin/feat/x"], HANDOFF_LOG]);
  });

  test("not in feat/<spec>: missing, with the command that fixes it", () => {
    const verdict = closeOut(worker, laneWorld(laneGit({ ancestor: { code: 1 } })));
    expect(closeOutLine(verdict ?? { kind: "missing", missing: [] })).toBe("Close-out: missing commits not merged back → merge-back x --push");
  });

  test("no commit on the record, or no fetch: not merged back, and nothing is asked of merge-base", () => {
    const unrecorded = laneGit();
    expect(closeOutLine(closeOut(worker, laneWorld(unrecorded, "approved by Anton")) ?? { kind: "missing", missing: [] })).toBe("Close-out: missing commits not merged back → merge-back x --push");
    const offline = laneGit({ fetch: { code: 1, stderr: "offline" } });
    expect(closeOutLine(closeOut(worker, laneWorld(offline)) ?? { kind: "missing", missing: [] })).toBe("Close-out: missing commits not merged back → merge-back x --push");
    expect([...unrecorded.calls, ...offline.calls].some((argv) => argv[1] === "merge-base")).toBe(false);
  });

  test("no Crew line in the last turn: read from the newest [handoff] commit body on the lane", () => {
    const quiet: LaunchedEntry = { ...worker, id: "w3" };
    transcript("sess-w3", "Merged back.");
    const verdict = closeOut(quiet, laneWorld(laneGit(), undefined, { agents: [{ ...agent, id: "w3", sessionId: "sess-w3" }] }));
    expect(verdict).toMatchObject({ kind: "ok", report: CREW });
  });

  test("no [handoff] commit since launch and none in the last turn: both named", () => {
    const quiet: LaunchedEntry = { ...worker, id: "w4" };
    transcript("sess-w4", "Stopped.");
    const verdict = closeOut(quiet, laneWorld(laneGit({ handoff: { stdout: "" } }), undefined, { agents: [{ ...agent, id: "w4", sessionId: "sess-w4" }] }));
    expect(closeOutLine(verdict ?? { kind: "missing", missing: [] })).toBe("Close-out: missing no [handoff] commit since launch, no Crew: line");
  });

  test("a ship-alone group is no lane: today's checks", () => {
    const shipAlone: HeldClaim = { ...closedClaim, claim: { ...closedClaim.claim, phase: "5", branch: "feat/x-pr-s" } };
    const git = strictRunner([
      [["git", "status", "--porcelain"], { stdout: "" }],
      [["git", "fetch", "-q", "origin", "feat/x-pr-s"], {}],
      [["git", "rev-parse", "HEAD"], { stdout: `${HEAD}\n` }],
      [["git", "rev-parse", "origin/feat/x-pr-s"], { stdout: `${HEAD}\n` }],
      [["git", "log", "origin/feat/x-pr-s", `--since=${LAUNCHED_AT}`, "--grep=^\\[handoff\\]", "--format=%H", "-1"], { stdout: "bbbb222\n" }],
    ]);
    const verdict = closeOut({ ...worker, title: "x execute 5" }, laneWorld(git, undefined, { claims: [shipAlone] }));
    expect(verdict).toMatchObject({ kind: "ok", report: CREW });
    expect(verdict).not.toHaveProperty("lane");
  });
});

function lanePhase(id: string, pr: string): PhaseState {
  return phaseState({ id, edges: phaseEdges({ declared: true, pr }) });
}
