import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { gitattributesIssues, UNION_RULES } from "../doctor/gitattributes";
import { repoWithOrigin, type TestRepo } from "./git-repo";
import { stubRunner } from "./stub-runner";

const CHECK_ATTR = ["git", "check-attr", "merge", "--"];

describe("gitattributesIssues", () => {
  test("silent when both INDEX roots merge with union", () => {
    const runner = stubRunner([[CHECK_ATTR, { stdout: "docs/specs/_probe/ledger/INDEX.md: merge: union\n_probe/docs/specs/_probe/ledger/INDEX.md: merge: union\n" }]]);
    expect(gitattributesIssues("/repo", runner)).toEqual([]);
  });

  test("one warning naming the rules that are missing", () => {
    const runner = stubRunner([[CHECK_ATTR, { stdout: "docs/specs/_probe/ledger/INDEX.md: merge: union\n_probe/docs/specs/_probe/ledger/INDEX.md: merge: unspecified\n" }]]);
    expect(gitattributesIssues("/repo", runner)).toEqual([
      {
        file: join("/repo", ".gitattributes"),
        severity: "warning",
        problem: "spec INDEX.md files don't merge with union, so parallel branches conflict on them; add: */docs/specs/**/INDEX.md merge=union",
      },
    ]);
  });

  test("skipped outside a git repo or without git", () => {
    expect(gitattributesIssues("/repo", stubRunner([]))).toEqual([]);
  });
});

describe("gitattributesIssues against real git", () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  test("reads the union rules from .gitattributes", () => {
    repo = repoWithOrigin("spec-attr-");
    expect(gitattributesIssues(repo.dir)).toHaveLength(1);
    repo.write(".gitattributes", `${UNION_RULES.join("\n")}\n`);
    expect(gitattributesIssues(repo.dir)).toEqual([]);
  });
});
