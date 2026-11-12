import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import type { RunOptions } from "../core/run";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { serializeDoc } from "../record/document";
import { gitRecordPort } from "../record/ref";
import { placeTree, type PlaceDeps } from "../trees/place";
import { placeDepsFor } from "../trees/place-system";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { phaseDoc, specDoc, task } from "./record-factories";
import { createTree, type Tree } from "./tree";

describe("trees place for a joined spec (real git)", () => {
  let repo: TestRepo;
  let claude: Tree;
  let home: string;
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
      [specDocPath("alpha")]: specDoc({ name: "alpha", phases: ["1"] }),
      [phaseDocPath("alpha", "1")]: phaseDoc({ id: "1", file: "phases/phase-1.md", pr: "B", tasks: [task({ id: "1.1", text: "item" })] }),
    };
    const commit = port.commit({ kind: "absent" }, Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })), "record: join alpha");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "absent" });
  });
  afterAll(() => {
    repo.cleanup();
    claude.cleanup();
  });

  test("takes the PR group from the record, not the frozen phase file", async () => {
    const placed = await placeTree({ spec: "alpha", phase: "1" }, placeDepsFor(repo.dir, deps()));
    expect(placed).toMatchObject({ ok: true, value: { path: join(home, "claude-worktrees", "work", "alpha-pr-b") } });
  });
});
