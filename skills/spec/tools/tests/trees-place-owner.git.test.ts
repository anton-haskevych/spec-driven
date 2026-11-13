import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import type { RunOptions } from "../core/run";
import { placeTree, type PlaceDeps } from "../trees/place";
import { placeDepsFor } from "../trees/place-system";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { createTree, type Tree } from "./tree";

describe("trees place onlyFor: the crew's owner gate (real git)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let home: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (): PlaceDeps => ({ runner, asyncRunner: isolatedAsyncRunner, claudeHome: claude.root, env: { CLAUDE_CODE_SESSION_ID: "me" }, home });
  const writeSpec = (name: string, owner?: string) => {
    repo.write(`docs/specs/${name}/CLAUDE.md`, `---\nstatus: active\n${owner ? `owner: ${owner}\n` : ""}---\n`);
    repo.write(`docs/specs/${name}/progress.md`, `- [ ] Phase 1 — One → \`phases/phase-1.md\`\n`);
    repo.write(`docs/specs/${name}/phases/phase-1.md`, "---\nneeds: []\npr: A\n---\n- [ ] item\n");
  };
  const treePath = (name: string) => join(home, "claude-worktrees", "work", `${name}-pr-a`);

  beforeAll(() => {
    repo = repoWithOrigin("spec-place-owner-");
    home = realpathSync(repo.root);
    claude = createTree("spec-place-owner-claude-");
    writeSpec("theirs", "taras");
    writeSpec("mine", "anton");
    writeSpec("shared");
    writeSpec("broken", "[taras]");
    repo.commitAll("specs on base");
    repo.git("push", "-q", "origin", "main");
    writeSpec("branchy", "taras");
    repo.commitAll("a spec only on this branch");
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  test("a spec owned by someone else is refused before any tree is cut", async () => {
    expect(await placeTree({ spec: "theirs", phase: "1", onlyFor: "Anton Haskevych" }, placeDepsFor(repo.dir, deps()))).toEqual({
      ok: false,
      reason: "theirs is taras's; this crew is Anton Haskevych's. Open it in your own session instead",
    });
    expect(existsSync(treePath("theirs"))).toBe(false);
  });

  test("the runner's own spec and a spec nobody owns are placed", async () => {
    expect(await placeTree({ spec: "mine", phase: "1", onlyFor: "Anton Haskevych" }, placeDepsFor(repo.dir, deps()))).toMatchObject({ ok: true, value: { kind: "added", path: treePath("mine") } });
    expect(await placeTree({ spec: "shared", phase: "1", onlyFor: "Anton Haskevych" }, placeDepsFor(repo.dir, deps()))).toMatchObject({ ok: true, value: { kind: "added", path: treePath("shared") } });
  });

  test("a malformed owner is offered to no one", async () => {
    expect(await placeTree({ spec: "broken", phase: "1", onlyFor: "taras" }, placeDepsFor(repo.dir, deps()))).toEqual({
      ok: false,
      reason: "broken's owner: is malformed; this crew is taras's. Open it in your own session instead",
    });
  });

  test("a spec only on this branch is gated by the checkout's copy", async () => {
    expect(await placeTree({ spec: "branchy", phase: "1", onlyFor: "anton" }, placeDepsFor(repo.dir, deps()))).toEqual({
      ok: false,
      reason: "branchy is taras's; this crew is anton's. Open it in your own session instead",
    });
  });

  test("when the group's tree exists, the refusal names its branch and path", async () => {
    expect(await placeTree({ spec: "theirs", phase: "1" }, placeDepsFor(repo.dir, deps()))).toMatchObject({ ok: true, value: { kind: "added", path: treePath("theirs") } });
    expect(await placeTree({ spec: "theirs", phase: "1", onlyFor: "anton" }, placeDepsFor(repo.dir, deps()))).toEqual({
      ok: false,
      reason: `theirs is taras's; this crew is anton's. Open it in your own session instead; its work so far is on feat/theirs-pr-a in ${treePath("theirs")}. Push it or hand it to taras`,
    });
  });
});
