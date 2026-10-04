import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { buildSnapshot, pinDefault, specDocChanges } from "../publish/snapshot";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("specDocChanges", () => {
  test("splits git's NUL-separated name-status into spec docs to publish and deletions, dropping code", () => {
    const nameStatus = ["M", "docs/specs/a/progress.md", "A", "landing/docs/specs/b/CLAUDE.md", "D", "docs/specs/a/old.md", "M", "src/app.ts", ""].join("\0");
    expect(specDocChanges(nameStatus)).toEqual({
      publish: ["docs/specs/a/progress.md", "landing/docs/specs/b/CLAUDE.md"],
      deleted: ["docs/specs/a/old.md"],
    });
  });

  test("empty output means nothing changed", () => {
    expect(specDocChanges("")).toEqual({ publish: [], deleted: [] });
  });
});

describe("buildSnapshot (real git)", () => {
  let repo: TestRepo;
  let main: string;

  beforeAll(() => {
    repo = repoWithOrigin("spec-snapshot-");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1\n");
    repo.write("docs/specs/a/old.md", "old\n");
    repo.write("src/app.ts", "v1\n");
    repo.commitAll("base");
    repo.git("push", "-q", "origin", "main");
    main = repo.git("rev-parse", "HEAD");
  });

  afterEach(() => {
    repo.git("checkout", "-q", "-f", "main");
    repo.git("clean", "-qfd");
  });

  afterAll(() => repo.cleanup());

  const git = () => gitAt(repo.dir, isolatedRunner);
  const fileAt = (commit: string, path: string) => repo.git("show", `${commit}:${path}`);
  const filesIn = (commit: string) => repo.git("ls-tree", "-r", "--name-only", commit).split("\n");

  test("pinDefault fetches and returns origin's tip", () => {
    expect(pinDefault(git(), "main")).toEqual({ ok: true, value: main });
  });

  test("takes committed spec docs on top of the merge-base, never code or uncommitted edits", () => {
    repo.git("checkout", "-q", "-b", "feat-a");
    repo.write("docs/specs/a/progress.md", "- [x] Phase 1\n");
    repo.write("landing/docs/specs/b/CLAUDE.md", "# b\n");
    repo.write("src/app.ts", "v2\n");
    repo.commitAll("work");
    repo.write("docs/specs/a/progress.md", "uncommitted\n");

    const snapshot = buildSnapshot(git(), { main, spec: "a" });
    if (!snapshot.ok || snapshot.value.kind !== "built") throw new Error(JSON.stringify(snapshot));
    const { commit, base, files } = snapshot.value;
    expect(base).toBe(main);
    expect(files).toEqual(["docs/specs/a/progress.md", "landing/docs/specs/b/CLAUDE.md"]);
    expect(fileAt(commit, "docs/specs/a/progress.md")).toBe("- [x] Phase 1");
    expect(fileAt(commit, "src/app.ts")).toBe("v1");
    expect(repo.git("log", "-1", "--format=%s %P", commit)).toBe(`docs(spec): snapshot a ${main}`);
  });

  test("a rename publishes the new path and reports the old one as not published", () => {
    repo.git("checkout", "-q", "-b", "feat-rename");
    repo.git("mv", "docs/specs/a/old.md", "docs/specs/a/new.md");
    repo.commitAll("rename");

    const snapshot = buildSnapshot(git(), { main });
    if (!snapshot.ok || snapshot.value.kind !== "built") throw new Error(JSON.stringify(snapshot));
    expect(snapshot.value.files).toEqual(["docs/specs/a/new.md"]);
    expect(snapshot.value.deleted).toEqual(["docs/specs/a/old.md"]);
    expect(filesIn(snapshot.value.commit)).toContain("docs/specs/a/old.md");
  });

  test("bases the next snapshot on the last one merged into the branch", () => {
    repo.git("checkout", "-q", "-b", "feat-again");
    repo.write("docs/specs/a/progress.md", "one\n");
    repo.commitAll("one");
    const first = buildSnapshot(git(), { main });
    if (!first.ok || first.value.kind !== "built") throw new Error(JSON.stringify(first));
    repo.git("merge", "-q", "--no-edit", first.value.commit);

    expect(buildSnapshot(git(), { main })).toEqual({ ok: true, value: { kind: "nothing", deleted: [] } });

    repo.write("docs/specs/a/design.md", "two\n");
    repo.commitAll("two");
    const second = buildSnapshot(git(), { main });
    if (!second.ok || second.value.kind !== "built") throw new Error(JSON.stringify(second));
    expect(second.value.base).toBe(first.value.commit);
    expect(second.value.files).toEqual(["docs/specs/a/design.md"]);
  });
});

describe("buildSnapshot after merging a main that carries another spec's snapshot (real git)", () => {
  let repo: TestRepo;

  beforeAll(() => {
    repo = repoWithOrigin("spec-snapshot-foreign-");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1\n");
    repo.commitAll("base");
    repo.git("push", "-q", "origin", "main");
  });

  afterAll(() => repo.cleanup());

  const git = () => gitAt(repo.dir, isolatedRunner);

  test("bases on the merge-base with main, so main's own spec edits never read as this branch's", () => {
    const oldMain = repo.git("rev-parse", "main");
    repo.git("checkout", "-q", "-b", "feat-other");
    repo.write("docs/specs/other/progress.md", "other\n");
    repo.commitAll("other work");
    const foreign = buildSnapshot(git(), { main: oldMain, spec: "other" });
    if (!foreign.ok || foreign.value.kind !== "built") throw new Error(JSON.stringify(foreign));

    repo.git("checkout", "-q", "main");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 (re-planned on main)\n");
    repo.commitAll("re-plan a on main");
    repo.git("checkout", "-q", "-b", "feat-a");
    repo.git("checkout", "-q", "main");
    repo.git("merge", "-q", "--no-edit", foreign.value.commit);
    const newMain = repo.git("rev-parse", "main");

    repo.git("checkout", "-q", "feat-a");
    repo.git("merge", "-q", "--no-edit", "main");
    repo.write("docs/specs/a/design.md", "mine\n");
    repo.commitAll("my work on a");

    const mine = buildSnapshot(git(), { main: newMain, spec: "a" });
    if (!mine.ok || mine.value.kind !== "built") throw new Error(JSON.stringify(mine));
    expect(mine.value.base).toBe(newMain);
    expect(mine.value.files).toEqual(["docs/specs/a/design.md"]);
  });
});
