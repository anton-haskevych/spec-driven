import { afterEach, describe, expect, test } from "bun:test";
import { ownerCommand } from "../commands/owner";
import { phaseCommand } from "../commands/phase";
import { gitAt } from "../core/git";
import { serializeDoc } from "../record/document";
import { META_PATH, RECORD_LAYOUT } from "../record/layout";
import { gitRecordPort } from "../record/ref";
import { OLDER_PLUGIN } from "../record/write";
import { isolatedRunner, type TestRepo } from "./git-repo";
import { joinedRepo } from "./joined-repo";

const NOW = new Date("2026-11-12T10:00:00Z");

// The next release raises the layout; this plugin must refuse, not fall back to the files it no longer owns.
describe("a record on a newer layout (real git)", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());

  function newerRecord(): TestRepo {
    const made = joinedRepo("spec-record-newer-");
    const port = gitRecordPort(gitAt(made.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const tip = made.git("--git-dir", made.origin, "rev-parse", "refs/spec-board/record");
    const commit = port.commit({ kind: "at", sha: tip }, [{ path: META_PATH, text: serializeDoc({ layout: RECORD_LAYOUT + 1 }) }], "record: layout from the future");
    if (!commit.ok) throw new Error(commit.reason);
    port.push(commit.value, { kind: "at", sha: tip });
    return made;
  }

  test("a phase write refuses and leaves the phase file alone", async () => {
    repo = newerRecord();
    const before = repo.git("show", "HEAD:docs/specs/alpha/phases/phase-3.md");
    const line = await phaseCommand(repo.dir, ["set", "alpha", "3", "--title", "Renamed"], undefined, { runner: isolatedRunner, env: {}, now: () => NOW });
    expect(line).toBe(`phase set: ${OLDER_PLUGIN}`);
    expect(repo.git("status", "--porcelain")).toBe("");
    expect(repo.git("show", "HEAD:docs/specs/alpha/phases/phase-3.md")).toBe(before);
  }, 30_000);

  test("a spec field refuses and lands nothing on main", async () => {
    repo = newerRecord();
    const commits = repo.git("--git-dir", repo.origin, "rev-list", "--count", "main");
    const line = await ownerCommand(repo.dir, ["alpha", "Taras"], isolatedRunner, { runner: isolatedRunner, env: {}, now: () => NOW });
    expect(line).toBe(`owner: refused, nothing written. ${OLDER_PLUGIN}`);
    expect(repo.git("--git-dir", repo.origin, "rev-list", "--count", "main")).toBe(commits);
  }, 30_000);
});
