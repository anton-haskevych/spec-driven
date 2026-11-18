import { describe, expect, test } from "bun:test";
import type { LaneRef } from "../publish/merge-back";
import { laneMergeLines, lanePushLines } from "../publish/merge-back-render";

const LANE: LaneRef = { spec: "x", branch: "feat/x-pr-b", specBranch: "feat/x", defaultBranch: "main" };
const GATES = { perCommit: "per-commit", afterMergeMain: "after-merge-main" };
const PUBLISHED = { kind: "published" as const, sha: "abc1234", main: "m", snapshot: "s", files: ["a"], deleted: [], snapshotMerged: { ok: true as const, value: undefined } };

describe("laneMergeLines", () => {
  test("main came in: both gates, after-merge-main first, then the result line", () => {
    expect(laneMergeLines(LANE, { kind: "merged", specBranch: 3, main: 11 }, GATES)).toEqual([
      "Gate: spec.ts gates --name after-merge-main",
      "Gate: spec.ts gates --name per-commit",
      "Merged feat/x (+3) and main (+11) into feat/x-pr-b · run the after-merge-main and per-commit gates above, commit, then merge-back x --push",
    ]);
  });

  test("only the spec branch came in: the per-commit gate alone", () => {
    expect(laneMergeLines(LANE, { kind: "merged", specBranch: 2, main: 0 }, GATES)).toEqual([
      "Gate: spec.ts gates --name per-commit",
      "Merged feat/x (+2) into feat/x-pr-b · run the per-commit gate above, commit, then merge-back x --push",
    ]);
  });

  test("no gates in settings still names the next step", () => {
    expect(laneMergeLines(LANE, { kind: "merged", specBranch: 0, main: 1 }, {})).toEqual(["Merged main (+1) into feat/x-pr-b · check it, commit any fixes, then merge-back x --push"]);
  });

  test("nothing new, a conflict, a refusal", () => {
    expect(laneMergeLines(LANE, { kind: "merged", specBranch: 0, main: 0 }, GATES)).toEqual(["feat/x-pr-b already holds feat/x and main · merge-back x --push"]);
    expect(laneMergeLines(LANE, { kind: "conflict", with: "main", paths: ["src/a.ts"] }, GATES)).toEqual(["merge-back: feat/x-pr-b conflicts with main in src/a.ts; resolve it here, commit, then merge-back x again"]);
    expect(laneMergeLines(LANE, { kind: "refused", reason: "uncommitted changes here; commit them first" }, GATES)).toEqual(["merge-back: uncommitted changes here; commit them first"]);
  });
});

describe("lanePushLines", () => {
  test("landed, with docs published, with none, and with docs: branch", () => {
    expect(lanePushLines(LANE, { kind: "pushed", commits: 4, docs: { ok: true, value: PUBLISHED } })).toEqual(["Merged back: feat/x-pr-b → feat/x (+4) · docs published to main"]);
    expect(lanePushLines(LANE, { kind: "pushed", commits: 4, docs: { ok: true, value: { kind: "nothing", main: "m", deleted: [] } } })).toEqual(["Merged back: feat/x-pr-b → feat/x (+4) · no new spec docs"]);
    expect(lanePushLines(LANE, { kind: "pushed", commits: 0 })).toEqual(["Merged back: feat/x already holds feat/x-pr-b"]);
  });

  test("a docs refusal comes after the push line, which stands", () => {
    expect(lanePushLines(LANE, { kind: "pushed", commits: 1, docs: { ok: false, reason: "diverged on main in a.md" } })).toEqual([
      "Merged back: feat/x-pr-b → feat/x (+1)",
      "merge-back: docs not published (diverged on main in a.md); the next merge-back x --push retries it",
    ]);
  });

  test("moved says to merge back again", () => {
    expect(lanePushLines(LANE, { kind: "moved" })).toEqual(["merge-back: feat/x moved; run merge-back x again"]);
  });
});
