import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { phaseCommand } from "../commands/phase";
import { prDocPath, specDocPath } from "../plan/kinds";
import { META_PATH, RECORD_REF } from "../record/layout";
import { isolatedRunner, type TestRepo } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-12T10:00:00Z");
const REAL_GIT_MS = 30_000;

describe("a spec joined under layout 1 (real git)", () => {
  let repo: TestRepo;
  const onRecord = (path: string) => JSON.parse(repo.git("--git-dir", repo.origin, "show", `${RECORD_REF}:${path}`));
  const phase = (...args: string[]) => phaseCommand(repo.dir, args, undefined, { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW });

  beforeEach(() => {
    repo = joinedRepo("spec-record-upgrade-");
    repo.write("docs/specs/alpha/CLAUDE.md", "---\nstatus: active\nowner: Taras\nship: auto\n---\n# Alpha\n");
    repo.write("docs/specs/alpha/pr-opening.md", "# PR\n\n## Spec state\n\nPR #12 merged 2026-11-10 as abc1234 (squash).\n");
    repo.commitAll("fields on main");
    repo.git("push", "-q", "origin", "main");
  });
  afterEach(() => repo.cleanup());

  test("is upgraded by the next write, in a batch of its own before the write", async () => {
    const line = await phase("set", "alpha", "3", "--title", "Renamed");
    expect(line).toStartWith("set: phase 3");
    expect(onRecord(specDocPath("alpha"))).toMatchObject({ layout: 2, status: "active", owner: "Taras", ship: "auto", planVersion: 2 });
    expect(onRecord(prDocPath("alpha", "default"))).toEqual({ group: "default", branch: "feat/alpha", state: "merged", number: 12, mergedAt: "2026-11-10", mergedSha: "abc1234", method: "squash" });
    expect(onRecord(META_PATH)).toEqual({ layout: 2 });
    expect(repo.git("--git-dir", repo.origin, "log", "--format=%s", "-2", RECORD_REF).split("\n")).toEqual(["record: set alpha (plan v2)", "record: upgrade alpha to layout 2"]);
  }, REAL_GIT_MS);

  test("a second write doesn't upgrade again", async () => {
    await phase("set", "alpha", "3", "--title", "Renamed");
    await phase("set", "alpha", "3", "--title", "Again");
    expect(repo.git("--git-dir", repo.origin, "log", "--format=%s", RECORD_REF).split("\n").filter((subject) => subject.startsWith("record: upgrade"))).toHaveLength(1);
  }, REAL_GIT_MS);
});
