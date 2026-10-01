import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { specsInPlay } from "../context/infer-spec";
import { systemRunner } from "../core/run";
import { repoWithOrigin, type TestRepo } from "./git-repo";
import { stubRunner } from "./stub-runner";

const specFiles = (repo: TestRepo, root: string, name: string) => {
  repo.write(`${root}/${name}/CLAUDE.md`, "---\nstatus: active\n---\n");
  repo.write(`${root}/${name}/progress.md`, "- [ ] Phase 1 — A → `phases/phase-1.md`\n");
};

describe("specsInPlay (real git)", () => {
  let repo: TestRepo;

  beforeAll(() => {
    repo = repoWithOrigin("spec-infer-");
    specFiles(repo, "docs/specs", "checkout");
    specFiles(repo, "docs/specs", "billing");
    specFiles(repo, "landing/docs/specs", "promo");
    repo.commitAll("specs on main");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => {
    repo.git("checkout", "-q", "-f", "main");
    repo.git("clean", "-qfd");
  });

  afterAll(() => repo.cleanup());

  const infer = () => specsInPlay(repo.dir, systemRunner);

  test("a main checkout with nothing changed has no spec in play", () => {
    expect(infer()).toEqual([]);
  });

  test("finds the spec the branch's own commits touched", () => {
    repo.git("checkout", "-q", "-b", "feat-a");
    repo.write("docs/specs/checkout/progress.md", "- [x] Phase 1 — A → `phases/phase-1.md`\n");
    repo.commitAll("tick");
    expect(infer()).toEqual(["checkout"]);
  });

  test("still finds it after main, holding the same docs (published) plus other specs' changes, is merged back in", () => {
    repo.git("checkout", "-q", "-b", "feat-b");
    repo.write("docs/specs/checkout/design.md", "# D\n");
    repo.commitAll("design");
    repo.git("checkout", "-q", "main");
    repo.write("docs/specs/checkout/design.md", "# D\n");
    repo.write("docs/specs/billing/design.md", "# B\n");
    repo.commitAll("billing on main");
    repo.git("push", "-q", "origin", "main");
    repo.git("checkout", "-q", "feat-b");
    repo.git("merge", "-q", "--no-edit", "origin/main");
    expect(infer()).toEqual(["checkout"]);
  });

  test("counts uncommitted and untracked files, including a brand-new spec folder", () => {
    specFiles(repo, "docs/specs", "fresh");
    expect(infer()).toEqual(["fresh"]);
  });

  test("covers */docs/specs roots and ignores _-prefixed folders", () => {
    repo.write("landing/docs/specs/promo/design.md", "# P\n");
    repo.write("docs/specs/_ledger/gotcha-x.md", "x\n");
    expect(infer()).toEqual(["promo"]);
  });

  test("lists every spec when several are in play", () => {
    repo.write("docs/specs/checkout/design.md", "# C\n");
    repo.write("docs/specs/billing/notes.md", "# B\n");
    expect(infer()).toEqual(["billing", "checkout"]);
  });

  test("drops names that are no longer specs in the project", () => {
    repo.write("docs/specs/deleted-spec/notes.md", "x\n");
    expect(infer()).toEqual([]);
  });
});

describe("specsInPlay (failures)", () => {
  test("outside a git repo there is no answer", () => {
    const dir = mkdtempSync(join(tmpdir(), "spec-infer-nogit-"));
    expect(specsInPlay(dir, systemRunner)).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  test("without a default branch it still reads uncommitted files, skipping rename sources", () => {
    const project = mkdtempSync(join(tmpdir(), "spec-infer-stub-"));
    mkdirSync(join(project, "docs/specs/checkout"), { recursive: true });
    writeFileSync(join(project, "docs/specs/checkout/CLAUDE.md"), "---\nstatus: active\n---\n");
    const runner = stubRunner([
      [["git", "rev-parse", "--show-toplevel"], { stdout: `${project}\n` }],
      [["git", "status"], { stdout: "R  docs/specs/checkout/new.md\0docs/specs/gone/old.md\0" }],
    ]);
    expect(specsInPlay(project, runner)).toEqual(["checkout"]);
    rmSync(project, { recursive: true, force: true });
  });
});
