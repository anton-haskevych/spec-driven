import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import type { RunOptions } from "../core/run";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { serializeDoc } from "../record/document";
import { gitRecordPort } from "../record/ref";
import { claimCommand } from "../commands/claim";
import { placeTree, type PlaceDeps } from "../trees/place";
import { placeDepsFor } from "../trees/place-system";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { phaseDoc, specDoc, task } from "./record-factories";
import { createTree, type Tree } from "./tree";

describe("trees place for a joined spec (real git)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let home: string;
  let elsewhere: string;
  const runner = { run: (argv: readonly string[], options?: RunOptions) => (argv[0] === "ps" ? { code: 0, stdout: `${process.pid} start\n`, stderr: "" } : isolatedRunner.run(argv, options)) };
  const deps = (): PlaceDeps => ({ runner, asyncRunner: isolatedAsyncRunner, claudeHome: claude.root, env: { CLAUDE_CODE_SESSION_ID: "me" }, home });

  beforeAll(() => {
    repo = repoWithOrigin("spec-place-joined-");
    home = realpathSync(repo.root);
    claude = createTree("spec-place-joined-claude-");
    repo.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/alpha/progress.md", "> On the board since 2026-11-11.\n");
    repo.write("docs/specs/alpha/phases/phase-1.md", "---\nneeds: []\npr: A\n---\n- [ ] frozen\n");
    repo.commitAll("alpha on base");
    repo.git("push", "-q", "origin", "main");
    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const docs = {
      [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1", "2"] }),
      [phaseDocPath("alpha", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", pr: "B", tasks: [task({ id: "1.1", text: "item" })] }),
      [phaseDocPath("alpha", "2")]: phaseDoc({ id: "2", file: "phases/phase-2.md", tasks: [
        task({ id: "2.1", text: "half", done: true, evidence: `${repo.git("rev-parse", "HEAD").trim()} on origin/feat/elsewhere` }),
        task({ id: "2.2", text: "rest" }),
      ] }),
    };
    const commit = port.commit({ kind: "absent" }, Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })), "record: join alpha");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "absent" });
    elsewhere = join(home, "elsewhere");
    repo.git("worktree", "add", "-q", "-b", "feat/elsewhere", elsewhere);
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  test("takes the PR group from the record, not the frozen phase file", async () => {
    const placed = await placeTree({ spec: "alpha", phase: "1" }, placeDepsFor(repo.dir, deps()));
    expect(placed).toMatchObject({ ok: true, value: { branch: "feat/alpha-pr-b" } });
  });

  test("a task done on another tree's branch: claim take refuses the phase and trees place returns that tree", async () => {
    const claim = await claimCommand(repo.dir, ["take", "alpha", "2"], { ...deps(), now: new Date(), host: "laptop" });
    expect(claim).toStartWith(`claim refused: phase 2 is in progress in ${elsewhere}`);
    expect(await placeTree({ spec: "alpha", phase: "2" }, placeDepsFor(repo.dir, deps()))).toMatchObject({ ok: true, value: { path: elsewhere } });
  });
});
