import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { baseCache, matchingPatterns, moveIntoPlace, pruneBases } from "../mainline/base-cache";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

describe("matchingPatterns", () => {
  test("keeps only the read-set patterns that match a path, so git archive never sees an empty one", () => {
    expect(matchingPatterns(["docs/specs/a/CLAUDE.md", "docs/specs/a/research/r.md", "src/app.ts"])).toEqual(["docs/specs/*/*.md"]);
    expect(matchingPatterns(["landing/docs/specs/b/phases/x/plan.md"])).toEqual(["*/docs/specs/*/phases/**/*.md"]);
    expect(matchingPatterns(["src/app.ts"])).toEqual([]);
  });
});

describe("moveIntoPlace", () => {
  test("a second extract of the same sha keeps the first one and drops its own copy", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-base-move-"));
    const [winner, loser] = [join(root, "winner"), join(root, "loser")];
    for (const dir of [winner, loser]) mkdirSync(dir);
    writeFileSync(join(winner, "first"), "");
    writeFileSync(join(loser, "second"), "");
    const target = join(root, "sha");

    moveIntoPlace(winner, target);
    moveIntoPlace(loser, target);

    expect(readdirSync(target)).toEqual(["first"]);
    expect(existsSync(loser)).toBe(false);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("pruneBases", () => {
  test("keeps the newest folders by mtime and never touches in-progress temp folders", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-base-prune-"));
    ["old", "mid", "new", ".tmp-x"].forEach((name, index) => {
      mkdirSync(join(root, name));
      const time = new Date(Date.UTC(2026, 9, 1, index));
      utimesSync(join(root, name), time, time);
    });

    pruneBases(root, 2);

    expect(readdirSync(root).toSorted()).toEqual([".tmp-x", "mid", "new"]);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("baseCache (real git)", () => {
  let repo: TestRepo;
  let sha: string;
  let commonDir: string;

  beforeAll(() => {
    repo = repoWithOrigin("spec-base-cache-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n# a — “quoted” →\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `../b-notes.md`\n");
    repo.write("docs/specs/a/pr-opening.md", "# PR\n");
    repo.write("docs/specs/a/phases/phase-1-one.md", "---\nneeds: []\n---\n");
    repo.write("docs/specs/a/research/2026-10-01-wave-0.md", "big\n");
    repo.write("landing/docs/specs/b/CLAUDE.md", "# b\n");
    repo.write("landing/docs/specs/b/phases/phase-2-two/plan.md", "# plan\n");
    repo.write("src/app.ts", "code\n");
    repo.commitAll("specs");
    sha = repo.git("rev-parse", "HEAD");
    commonDir = repo.git("rev-parse", "--path-format=absolute", "--git-common-dir");
  });

  afterAll(() => repo.cleanup());

  test("extracts the read set of both spec roots into <common-dir>/spec-board/base/<sha>", async () => {
    const result = await baseCache(gitAt(repo.dir, isolatedRunner), sha, commonDir);
    if (!result.ok) throw new Error(result.reason);
    const dir = result.value;

    expect(dir).toBe(join(commonDir, "spec-board", "base", sha));
    expect(await Bun.file(join(dir, "docs/specs/a/CLAUDE.md")).text()).toContain("“quoted” →");
    for (const path of ["docs/specs/a/pr-opening.md", "docs/specs/a/phases/phase-1-one.md", "landing/docs/specs/b/phases/phase-2-two/plan.md"]) {
      expect(existsSync(join(dir, path))).toBe(true);
    }
    expect(existsSync(join(dir, "docs/specs/a/research"))).toBe(false);
    expect(existsSync(join(dir, "src"))).toBe(false);
  });

  test("a cached sha is reused without running git", async () => {
    const first = await baseCache(gitAt(repo.dir, isolatedRunner), sha, commonDir);
    const noGit = gitAt(repo.dir, { run: () => ({ code: 1, stdout: "", stderr: "git must not run" }) });
    expect(await baseCache(noGit, sha, commonDir)).toEqual(first);
  });

  test("a repo with one spec root still archives (an unmatched pattern would make git exit 128)", async () => {
    const single = repoWithOrigin("spec-base-single-");
    single.write("docs/specs/c/CLAUDE.md", "# c\n");
    single.commitAll("one root");
    const singleCommon = single.git("rev-parse", "--path-format=absolute", "--git-common-dir");

    const result = await baseCache(gitAt(single.dir, isolatedRunner), single.git("rev-parse", "HEAD"), singleCommon);

    expect(result.ok && existsSync(join(result.value, "docs/specs/c/CLAUDE.md"))).toBe(true);
    single.cleanup();
  });
});
