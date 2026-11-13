import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { publishDocsReport } from "../commands/publish-docs";
import { pushReport } from "../commands/push";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const SETTINGS = "docs/specs/_playbook/settings.md";

describe("push and publish-docs commands (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-publish-cmd-");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1\n");
    repo.write(SETTINGS, "---\ndocs: main\n---\n");
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
    repo.git("checkout", "-q", "-b", "feat");
  });

  afterEach(() => repo.cleanup());

  const sha = () => repo.git("--git-dir", repo.origin, "rev-parse", "--short=7", "main");

  test("push prints the Remote line", () => {
    repo.write("src/a.ts", "a\n");
    repo.commitAll("code");
    expect(pushReport(repo.dir, [], isolatedRunner)).toBe("Remote: pushed feat (+1)");
  });

  test("publish-docs pushes the branch, publishes, pushes the merge-back, and prints one Remote line", () => {
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.write("src/a.ts", "a\n");
    repo.commitAll("tick");

    const report = publishDocsReport(repo.dir, ["a"], isolatedRunner);
    expect(report).toBe(
      [`Remote: pushed feat (+2) · docs → main ${sha()}`, `published 1 file to main (${sha()}): docs/specs/a/progress.md`].join("\n"),
    );
    expect(repo.git("rev-parse", "HEAD")).toBe(repo.git("rev-parse", "origin/feat"));
  });

  test("a refused publish still reports the branch push", () => {
    const other = repo.clone("other");
    other.write("docs/specs/a/progress.md", "- [ ] Phase 1 (renamed)\n");
    other.commitAll("main edit");
    other.git("push", "-q", "origin", "main");
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick");

    expect(publishDocsReport(repo.dir, ["a"], isolatedRunner)).toBe(
      ["Remote: pushed feat (+1) · behind main 1", "publish-docs: diverged on main in docs/specs/a/progress.md — merge main first; nothing pushed"].join("\n"),
    );
  });

  test("docs: branch projects and the default branch get a no-op line", () => {
    repo.write(SETTINGS, "---\ndocs: branch\n---\n");
    repo.commitAll("docs ride the PR");
    expect(publishDocsReport(repo.dir, [], isolatedRunner)).toBe("publish-docs: docs: branch — spec docs ride the feature PR; use spec.ts push");

    repo.git("checkout", "-q", "main");
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.commitAll("tick on main");
    expect(publishDocsReport(repo.dir, [], isolatedRunner)).toBe("Remote: pushed main (+1)\npublish-docs: on main — the push published the docs");
  });

  test("errors come back as a line, never a throw", () => {
    repo.git("checkout", "-q", "--detach");
    expect(pushReport(repo.dir, [], isolatedRunner)).toBe("push: detached HEAD — check out a branch before pushing");
  });
});
