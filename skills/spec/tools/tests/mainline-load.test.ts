import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { baseProject, loadMainline, type MainlineOptions } from "../mainline/load";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const FETCHED: MainlineOptions = { timeoutMs: 10_000, local: false };

describe("loadMainline (real git)", () => {
  let repo: TestRepo;

  beforeAll(() => {
    repo = repoWithOrigin("spec-mainline-");
    repo.write("docs/specs/a/CLAUDE.md", "---\nstatus: active\n---\n");
    repo.write("docs/specs/a/progress.md", "- [ ] Phase 1 — One → `phases/phase-1-one.md`\n");
    repo.write("docs/specs/a/phases/phase-1-one.md", "---\nneeds: []\n---\n- [ ] item\n");
    repo.write("docs/specs/b/CLAUDE.md", "---\nstatus: prep\n---\n");
    repo.write("docs/specs/c/CLAUDE.md", "---\nstatus: prep\n---\n");
    repo.write("docs/specs/c/product-brief.md", "# brief\n");
    repo.write("docs/specs/_backlog/idea.md", "---\ntitle: An idea\n---\n");
    repo.commitAll("specs");
    repo.git("push", "-q", "origin", "main");
    const other = repo.clone("other");
    other.write("docs/specs/a/progress.md", "- [x] Phase 1 — One → `phases/phase-1-one.md`\n");
    other.commitAll("tick on origin");
    other.git("push", "-q", "origin", "main");
    repo.write("docs/specs/a/progress.md", "local edit\n");
  });

  afterAll(() => repo.cleanup());

  const git = () => gitAt(repo.dir, isolatedRunner);

  test("baseProject extracts the spec docs at a given sha, not the checkout's", async () => {
    const sha = repo.git("rev-parse", "HEAD");
    const project = await baseProject(git(), sha);
    if (!project.ok) throw new Error(project.reason);
    expect(project.value.dir).toBe(project.value.root);
    expect(readFileSync(join(project.value.root, "docs/specs/a/progress.md"), "utf8")).toBe("- [ ] Phase 1 — One → `phases/phase-1-one.md`\n");
  });

  test("fetches origin and loads its spec docs, not the checkout's", async () => {
    const result = await loadMainline(git(), "main", FETCHED);
    if (!result.ok) throw new Error(result.reason);
    const { base, states, nodes, stages, backlog } = result.value;

    expect(base.sha).toBe(repo.git("rev-parse", "origin/main"));
    expect(base.fetch).toEqual({ ok: true, value: undefined });
    expect(base.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(states.get("a")?.phases[0]?.done).toBe(true);
    expect(nodes.get("a")?.status).toBe("active");
    expect([...stages]).toEqual([["b", "prep"], ["c", "create"]]);
    expect(backlog.map((item) => item.slug)).toEqual(["idea"]);
  });

  test("--local skips the fetch and reads the local origin ref", async () => {
    const result = await loadMainline(git(), "main", { ...FETCHED, local: true });
    expect(result.ok && result.value.base.fetch).toBe("local");
  });

  test("a failed fetch falls back to the local origin ref and keeps the reason", async () => {
    repo.git("remote", "set-url", "origin", join(repo.root, "gone.git"));
    const result = await loadMainline(git(), "main", FETCHED);
    repo.git("remote", "set-url", "origin", repo.origin);

    if (!result.ok) throw new Error(result.reason);
    expect(result.value.base.sha).toBe(repo.git("rev-parse", "origin/main"));
    expect(result.value.base.fetch).toMatchObject({ ok: false });
  });

  test("no origin ref at all makes the board unavailable", async () => {
    const lone = mkdtempSync(join(tmpdir(), "spec-mainline-lone-"));
    isolatedRunner.run(["git", "init", "-q", "-b", "main"], { cwd: lone });

    const result = await loadMainline(gitAt(lone, isolatedRunner), "main", { ...FETCHED, local: true });

    expect(result).toEqual({ ok: false, reason: "no origin/main ref" });
    rmSync(lone, { recursive: true, force: true });
  });
});
