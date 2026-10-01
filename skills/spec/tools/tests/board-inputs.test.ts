import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadBoard, loadBoardInputs, repoName, type BoardRunners } from "../board/load";
import { renderBoard } from "../board/render";
import { NOW } from "./board-factories";
import type { RunOptions } from "../core/run";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { cannedGh } from "./stub-runner";
import { createTree } from "./tree";

const runners: BoardRunners = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, claudeHome: "/no/claude/home" };

describe("loadBoardInputs (real git)", () => {
  let repo: TestRepo;
  let worktree: string;

  beforeAll(() => {
    repo = repoWithOrigin("spec-board-inputs-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n");
    repo.write("docs/specs/_backlog/idea.md", "---\ntitle: An idea\n---\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    worktree = join(repo.root, "wt");
    repo.git("worktree", "add", "-q", "-b", "wt", worktree);
    repo.write("../wt/docs/specs/a/progress.md", "- [x] Phase 1 — One → `phases/phase-1-one.md`\n");
  });

  afterAll(() => repo.cleanup());

  test("reads the same base from the main checkout and from a worktree with local edits", async () => {
    const fromMain = await loadBoardInputs(repo.dir, { local: true }, runners);
    const fromWorktree = await loadBoardInputs(worktree, { local: true }, runners);
    if (!fromMain.ok || !fromWorktree.ok) throw new Error(JSON.stringify([fromMain, fromWorktree]));

    expect(fromMain.value.repo).toBe("work");
    expect(fromWorktree.value.repo).toBe("work");
    expect(fromWorktree.value.base).toEqual(fromMain.value.base);
    expect(fromWorktree.value.states.get("a")?.phases[0]?.done).toBe(false);
    expect(fromMain.value.backlogCount).toBe(1);
  });
});

describe("repoName", () => {
  test("names the repo from its common dir, for a normal clone and for a bare one", () => {
    expect(repoName("/Users/a/IdeaProjects/crm/.git")).toBe("crm");
    expect(repoName("/Users/a/repos/crm.git")).toBe("crm");
  });
});

describe("loadBoard with worktrees (real git)", () => {
  let repo: TestRepo;
  let fromMain: string;
  let fromWorktree: string;
  const phaseFile = (needs: string, ticked: boolean) => `---\nneeds: [${needs}]\n---\n## Deliverables\n- [${ticked ? "x" : " "}] item\n`;
  const progress = (ticks: boolean[]) => ticks.map((done, index) => `- [${done ? "x" : " "}] Phase ${index + 1} — P${index + 1} → \`phases/phase-${index + 1}.md\`\n`).join("");
  const render = async (dir: string) => {
    const board = await loadBoard(dir, { local: true }, runners, NOW);
    if (!board.ok) throw new Error(board.reason);
    return renderBoard(board.value);
  };

  beforeAll(async () => {
    repo = repoWithOrigin("spec-board-overlay-");
    repo.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/alpha/progress.md", progress([true, false, false]));
    repo.write("docs/specs/alpha/phases/phase-1.md", phaseFile("", true));
    repo.write("docs/specs/alpha/phases/phase-2.md", phaseFile("1", false));
    repo.write("docs/specs/alpha/phases/phase-3.md", phaseFile("2", false));
    repo.commitAll("alpha");
    repo.git("push", "-q", "origin", "main");

    const ticking = repo.addWorktree("alpha-2", "feat/alpha-2");
    ticking.write("docs/specs/alpha/progress.md", progress([true, true, false]));
    ticking.write("docs/specs/alpha/phases/phase-2.md", phaseFile("1", true));
    ticking.commitAll("alpha phase 2");
    const fresh = repo.addWorktree("fresh", "feat/fresh");
    fresh.write("docs/specs/fresh/CLAUDE.md", "---\nstatus: active\n---\n");
    fresh.write("docs/specs/fresh/progress.md", progress([false]));
    fresh.write("docs/specs/fresh/phases/phase-1.md", phaseFile("", false));
    fresh.commitAll("fresh spec");

    fromMain = await render(repo.dir);
    fromWorktree = await render(ticking.dir);
  });

  afterAll(() => repo.cleanup());

  test("shows branch ticks in flight, their dependents ready there, and branch-only specs", () => {
    expect(fromMain).toMatch(/alpha · 2 +alpha-2 +— +— +ticked on branch, not merged/);
    expect(fromMain).toMatch(/alpha · 3 +\/spec execute +in alpha-2 \(needs 2, ticked there\)/);
    expect(fromMain).toMatch(/fresh · 1 +\/spec execute +only on feat\/fresh/);
  });

  test("joins the worktree's PR and live session onto its in-flight row", async () => {
    const claude = createTree("spec-board-claude-");
    const cwd = join(repo.root, "alpha-2", "skills");
    mkdirSync(cwd, { recursive: true });
    const session = { pid: process.pid, sessionId: "s1", cwd, procStart: "start", status: "idle", updatedAt: NOW.getTime() - 3 * 3_600_000 };
    claude.write(`sessions/${process.pid}.json`, JSON.stringify(session));
    const openPr = { number: 881, headRefName: "feat/alpha-2", isDraft: false, url: "u", statusCheckRollup: [{ __typename: "CheckRun", name: "ci", status: "COMPLETED", conclusion: "FAILURE", startedAt: "t" }] };
    const asyncRunner = cannedGh(isolatedAsyncRunner, [
      [["gh", "pr", "list", "--state", "open"], { stdout: JSON.stringify([openPr]) }],
      [["gh", "pr", "list", "--state", "all"], { stdout: "[]" }],
    ]);
    const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
    try {
      const board = await loadBoard(repo.dir, { local: false }, { runner, asyncRunner, claudeHome: claude.root }, NOW);
      if (!board.ok) throw new Error(board.reason);
      expect(renderBoard(board.value)).toMatch(/alpha · 2 +alpha-2 +idle 3h +#881 ✗ 1 +fix CI/);
      expect(board.value.lanes.needsYou[0]).toEqual({ kind: "fix", spec: "alpha", phase: "2", pr: 881, failing: 1 });
    } finally {
      claude.cleanup();
    }
  });

  test("gh and session failures leave ? and unknown cells and say why in the footer", async () => {
    const asyncRunner = cannedGh(isolatedAsyncRunner, [[["gh"], { code: 1, stderr: "gh: not logged in" }]]);
    const board = await loadBoard(repo.dir, { local: false }, { runner: isolatedRunner, asyncRunner, claudeHome: "/no/claude/home" }, NOW);
    if (!board.ok) throw new Error(board.reason);
    const output = renderBoard(board.value);
    expect(output).toMatch(/alpha · 2 +alpha-2 +unknown +\? +ticked on branch, not merged/);
    expect(output).toContain("PRs unavailable: gh: not logged in");
    expect(output).toContain("sessions unavailable: no /no/claude/home/sessions");
  });

  test("prints the same board from the main checkout and from a worktree, except ◀ here", () => {
    const normalized = (text: string) => text.replace(" ◀ here", "").replace(/ +/g, " ");
    expect(fromWorktree).toContain("alpha-2 ◀ here");
    expect(fromMain).not.toContain("◀ here");
    expect(normalized(fromWorktree)).toBe(normalized(fromMain));
  });
});
