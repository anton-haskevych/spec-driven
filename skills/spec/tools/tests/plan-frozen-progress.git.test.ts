import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { frozenProgress } from "../plan/frozen-progress";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const LISTED = "docs/specs/x/progress.md";
const STUB_ONLY = "docs/specs/y/progress.md";
const LIST = "# X\n\n## Phases\n\nv1:\n- [ ] Phase 1 — One → `phases/phase-1.md`\n";
const STUB = "# X\n\n> On the board since 2026-11-12. This list is frozen; the board is the source.\n";

describe("frozenProgress", () => {
  let repo: TestRepo;
  beforeAll(() => {
    repo = repoWithOrigin("frozen-progress-");
    repo.write(LISTED, LIST);
    repo.commitAll("spec");
    repo.write(LISTED, STUB);
    repo.write(STUB_ONLY, STUB);
    repo.commitAll("tidy");
    repo.git("push", "-q", "origin", "main");
  });
  afterAll(() => repo.cleanup());

  test("gives the default branch's newest progress.md that still has its phase list", () => {
    expect(frozenProgress(gitAt(repo.dir, isolatedRunner), "origin/main", LISTED)).toBe(LIST);
  });

  test("nothing when no version had a list", () => {
    expect(frozenProgress(gitAt(repo.dir, isolatedRunner), "main", STUB_ONLY)).toBeUndefined();
  });
});
