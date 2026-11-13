import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { contextPack } from "../commands/context";
import { phaseCommand } from "../commands/phase";
import { recordCommand, systemRecordDeps } from "../commands/record";
import { contextDeps } from "./context-fixture";
import { isolatedRunner, type TestRepo, type WorkingCopy } from "./git-repo";
import { joinedRepo, recordPhase } from "./joined-repo";

const NOW = new Date("2026-11-12T10:00:00Z");
// Each tick is a push and a record write against a local origin: about a second apiece on a loaded Mac.
const REAL_GIT_MS = 30_000;
const ENV = { CLAUDE_CODE_SESSION_ID: "s-offline" };
const BRANCH = "feat/alpha-pr-a";

describe("ticks made while origin is unreachable (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const work = (file: string) => {
    tree.write(`src/${file}.ts`, `${file}\n`);
    tree.commitAll(file);
    return tree.git("rev-parse", "HEAD");
  };
  const tick = (task: string) => phaseCommand(tree.dir, ["tick", "alpha", task.split(".")[0] ?? "", task], undefined, { runner: isolatedRunner, env: ENV, now: () => NOW });
  const sync = () => recordCommand(tree.dir, ["sync"], { ...systemRecordDeps(), runner: isolatedRunner, env: ENV, now: () => NOW });
  const offline = () => tree.git("remote", "set-url", "origin", join(repo.root, "nowhere.git"));
  const online = () => tree.git("remote", "set-url", "origin", repo.origin);

  beforeAll(() => {
    repo = joinedRepo("spec-record-offline-");
    tree = repo.clone("pr-a");
    tree.git("checkout", "-q", "-b", BRANCH);
    tree.git("fetch", "-q", "origin", "+refs/spec-board/record:refs/spec-board-remote/record");
  });

  afterAll(() => repo.cleanup());

  test("two ticks are kept here, shown done with the pending count, and one sync lands both with their commits", async () => {
    offline();
    const first = work("one");
    expect(await tick("2.3")).toBe("tick: kept on this machine (origin unreachable); 1 change not shared yet");
    const second = work("two");
    expect(await tick("2.4")).toBe("tick: kept on this machine (origin unreachable); 2 changes not shared yet");

    const pack = await contextPack(tree.dir, { mode: "execute", name: "alpha" }, contextDeps({ runner: isolatedRunner, now: () => NOW }));
    expect(pack).toContain("- [x] 2.3 three");
    expect(pack).toContain("- [x] 2.4 four");
    expect(pack).toContain("· 2 changes not shared yet");

    online();
    expect(await sync()).toContain("sent 2 · nothing queued");
    expect(recordPhase(repo, "2").tasks.slice(0, 2)).toEqual([
      expect.objectContaining({ id: "2.3", done: true, evidence: `${first} on origin/${BRANCH}` }),
      expect.objectContaining({ id: "2.4", done: true, evidence: `${second} on origin/${BRANCH}` }),
    ]);
    expect(recordPhase(repo, "2").tasks[0]?.unpushed).toBeUndefined();
    expect(repo.git("--git-dir", repo.origin, "rev-parse", `refs/heads/${BRANCH}`)).toBe(second);
  }, REAL_GIT_MS);

  test("a queued tick whose commit left the branch is refused and stays", async () => {
    offline();
    const dropped = work("dropped");
    expect(await tick("2.5")).toEndWith("1 change not shared yet");
    tree.git("reset", "-q", "--hard", "HEAD~1");
    online();
    work("instead");
    tree.git("push", "-q", "origin", BRANCH);

    expect(await sync()).toContain(`1 change not shared yet · #1 refused: ${dropped.slice(0, 7)} is no longer on ${BRANCH} (record drop 1)`);
    expect(recordPhase(repo, "2").tasks[2]?.done).toBe(false);
  }, REAL_GIT_MS);
});
