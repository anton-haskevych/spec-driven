import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOARD_USAGE, boardCommand, type BoardDeps } from "../commands/board";
import { listCommand } from "../commands/list";
import { NOW } from "./board-factories";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { asyncStubRunner, cannedGh, stubRunner } from "./stub-runner";

describe("board and list commands (real git)", () => {
  let repo: TestRepo;
  const claudeHome = mkdtempSync(join(tmpdir(), "spec-board-claude-"));
  mkdirSync(join(claudeHome, "sessions"));
  const asyncRunner = cannedGh(isolatedAsyncRunner, [[["gh", "pr", "list"], { stdout: "[]" }]]);
  const deps: BoardDeps = { runner: isolatedRunner, asyncRunner, claudeHome, now: NOW, env: {} };

  beforeAll(() => {
    repo = repoWithOrigin("spec-board-command-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\npriority: p1\n---\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n- [ ] Phase 2 — Two → `phases/phase-2-two.md`\n");
    repo.write("docs/specs/a/phases/phase-1-one.md", "---\nneeds: []\n---\n- [ ] item\n");
    repo.write("docs/specs/a/phases/phase-2-two.md", "---\nneeds: [1]\n---\n- [ ] item\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
  });

  afterAll(() => {
    repo.cleanup();
    rmSync(claudeHome, { recursive: true, force: true });
  });

  test("board --json prints the versioned model for agents", async () => {
    const { board } = JSON.parse(await boardCommand(repo.dir, ["--json", "--local"], deps));
    expect(board.version).toBe(1);
    expect(board.base.mode).toBe("local");
    expect(board.lanes.ready.map((row: { spec: string; phase: string }) => `${row.spec}#${row.phase}`)).toEqual(["a#1"]);
    expect(board.lanes.blocked).toEqual([{ spec: "a", phase: "2", reasons: ["needs 1"] }]);
  });

  test("board <lane> prints that lane alone, in a code fence", async () => {
    const output = await boardCommand(repo.dir, ["ready", "--local"], deps);
    expect(output).toStartWith("```\nspec board · work · local, origin/main as of ");
    expect(output).toContain("READY");
    expect(output).not.toContain("BLOCKED");
    expect(output).toEndWith("\n```");
  });

  test("board focus prints the FOCUS lane alone, none when no spec has focus:", async () => {
    const output = await boardCommand(repo.dir, ["focus", "--local"], deps);
    expect(output).toContain("\n\nFOCUS\n  none\n```");
    expect(output).not.toContain("READY");
  });

  test("board refuses an unknown lane or flag with its usage", async () => {
    expect(await boardCommand(repo.dir, ["soon"], deps)).toBe("board: unknown lane soon (focus, flight, ready, blocked, you)");
    expect(await boardCommand(repo.dir, ["--fast"], deps)).toStartWith("usage: board");
  });

  test("list with no arguments fetches and prints the whole board; a filter keeps the table", async () => {
    const board = await listCommand(repo.dir, [], deps);
    expect(board).toStartWith("```\nspec board · work · origin/main ");
    expect(board).toContain("fetched");
    expect(board).toContain("NEEDS YOU");
    expect(board).not.toContain("unavailable");
    expect(await listCommand(repo.dir, ["p1"], deps)).toContain("## Open specs (1)");
    expect(await listCommand(repo.dir, ["table"], deps)).toContain("| a | active | p1 |");
  });
});

describe("board focus --who (real git)", () => {
  let repo: TestRepo;
  const claudeHome = mkdtempSync(join(tmpdir(), "spec-board-who-claude-"));
  mkdirSync(join(claudeHome, "sessions"));
  const deps: BoardDeps = { runner: isolatedRunner, asyncRunner: isolatedAsyncRunner, claudeHome, now: NOW, env: {} };
  const spec = (name: string, meta: string) => {
    repo.write(`docs/specs/${name}/CLAUDE.md`, `---\nstatus: active\n${meta}---\n`);
    repo.write(`docs/specs/${name}/progress.md`, `- [ ] Phase 1 — One → \`phases/phase-1-one.md\`\n`);
    repo.write(`docs/specs/${name}/phases/phase-1-one.md`, "---\nneeds: []\n---\n- [ ] item\n");
  };

  beforeAll(() => {
    repo = repoWithOrigin("spec-board-who-");
    spec("first", "focus: 10\n");
    spec("second", "focus: 20\nowner: Taras Korpach\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
  });

  afterAll(() => {
    repo.cleanup();
    rmSync(claudeHome, { recursive: true, force: true });
  });

  test("--json keeps only that person's rows, at their place in the lane", async () => {
    const { board } = JSON.parse(await boardCommand(repo.dir, ["focus", "--who", "taras", "--json", "--local"], deps));
    expect(board.lanes.focus.map((row: { spec: string; position: number }) => [row.spec, row.position])).toEqual([["second", 2]]);
    expect(board.me).toBe("spec-tests");
  });

  test("text names the person; me with nothing on the board is none", async () => {
    expect(await boardCommand(repo.dir, ["focus", "--who", "taras", "--local"], deps)).toContain("\n\nFOCUS · taras\n  2  second  0/1  ready 1  — (Taras Korpach)\n```");
    expect(await boardCommand(repo.dir, ["--who", "me", "--local"], deps)).toContain("\n\nFOCUS · me\n  none\n\nIN FLIGHT");
  });

  test("--who with another lane, or without a name, is a usage error", async () => {
    expect(await boardCommand(repo.dir, ["ready", "--who", "taras"], deps)).toBe(`usage: ${BOARD_USAGE}`);
    expect(await boardCommand(repo.dir, ["focus", "--who"], deps)).toBe(`usage: ${BOARD_USAGE}`);
  });
});

describe("when the board can't be built", () => {
  const project = mkdtempSync(join(tmpdir(), "spec-board-nogit-"));
  mkdirSync(join(project, "docs/specs/a"), { recursive: true });
  writeFileSync(join(project, "docs/specs/a/CLAUDE.md"), "---\nstatus: active\n---\n");
  const deps: BoardDeps = { runner: stubRunner([]), asyncRunner: asyncStubRunner([]), claudeHome: project, now: NOW, env: {} };
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("board --json says why, with a null board", async () => {
    expect(JSON.parse(await boardCommand(project, ["--json"], deps))).toEqual({ board: null, error: "no default branch (origin/HEAD is unset and gh did not answer)" });
  });

  test("list falls back to the table and says why", async () => {
    const output = await listCommand(project, [], deps);
    expect(output).toContain("## Open specs (1)");
    expect(output).toEndWith("board unavailable: no default branch (origin/HEAD is unset and gh did not answer)");
  });
});
