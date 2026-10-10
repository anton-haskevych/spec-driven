import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prCommand } from "../commands/pr";
import { PR_MERGE_USAGE, prMerge } from "../commands/pr/merge";
import { gitAt, stateDir } from "../core/git";
import type { RunResult } from "../core/run";
import { readEvents } from "../pr/babysit/log";
import type { PrView } from "../pr/checks/types";
import { specPrNumbers } from "../pr/resolve";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { check, ghPrViewJson, phasedSpecFiles } from "./pr-factories";
import { routeGh, sequencedRunner } from "./stub-runner";

const BRANCH = "feat/billing-pr-a";
const HEAD = "1a2b3c4d5e6f";
const MERGE_SHA = "9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c";
const OPENING = "docs/specs/billing/pr-opening.md";
const SPEC_STATE = "# PR Opening\n\n## Spec state\n\nDone: phase 1.\n\n## Pre-PR checks\n\n- [ ] tests\n";
const LINE = "PR #921 merged 2026-10-10 as 9b0c1d2 (merge).";
const GREEN = [check({ name: "Backend Tests" }), check({ name: "Vercel – crm-dance-landing", bucket: "running" })];
const fixture = (name: string) => readFileSync(join(import.meta.dir, "fixtures", name), "utf8");

type Reply = [readonly string[], Partial<RunResult>[]];

describe("pr merge", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  afterEach(() => repo?.cleanup());

  function setup(settings = "---\npr:\n  merge: merge\nchecks:\n  external: [\"Vercel*\"]\n---\n") {
    repo = repoWithOrigin("spec-pr-merge-");
    const spec = { "CLAUDE.md": "---\nstatus: active\n---\n", ...phasedSpecFiles([{ id: "1", title: "Invoices", pr: "A" }]) };
    for (const [path, text] of Object.entries(spec)) repo.write(`docs/specs/billing/${path}`, text);
    repo.write(OPENING, SPEC_STATE);
    repo.write("docs/specs/_playbook/settings.md", settings);
    repo.commitAll("spec");
    repo.git("push", "-q", "origin", "main");
    tree = repo.addWorktree("tree", BRANCH);
  }

  function gh(view: Partial<PrView>, extra: Reply[] = []) {
    const stub = sequencedRunner([
      [["gh", "repo", "view"], [{ stdout: "main\n" }]],
      [["gh", "pr", "view"], [{ stdout: ghPrViewJson({ number: 921, headRefOid: HEAD, headRefName: BRANCH, ...view }) }]],
      ...extra,
    ]);
    return { stub, runner: routeGh(stub, isolatedRunner) };
  }
  const put = (result: Partial<RunResult>): Reply => [["gh", "api", "-X", "PUT"], [result]];
  const merged = () => put({ stdout: fixture("gh-merge-200.json") });
  const merge = (args: string[], runner: ReturnType<typeof gh>["runner"]) =>
    prMerge(tree.dir, [...args, "--date", "2026-10-10"], { runner, now: () => new Date("2026-10-11T04:58:00Z") });
  const onMain = () => repo.git("--git-dir", repo.origin, "show", `main:${OPENING}`);
  const mainCommits = () => Number(repo.git("--git-dir", repo.origin, "rev-list", "--count", "main"));
  const events = () => {
    const dir = stateDir(gitAt(tree.dir, isolatedRunner), "babysit");
    return dir.ok ? readEvents(dir.value, 921).events : [];
  };

  test("green: merges with pr.merge pinned to the head, lands the merge line on main and logs merged", async () => {
    setup();
    const { stub, runner } = gh({ checks: GREEN }, [merged()]);
    expect(await merge(["billing", "A"], runner)).toBe("Merged: #921 · merge · 9b0c1d2");
    expect(stub.calls.find((call) => call[2] === "-X")).toEqual(["gh", "api", "-X", "PUT", "repos/{owner}/{repo}/pulls/921/merge", "-f", "merge_method=merge", "-f", `sha=${HEAD}`]);
    expect(onMain()).toContain(`Done: phase 1.\n${LINE}\n\n## Pre-PR checks`);
    expect(specPrNumbers(onMain())).toEqual([921]);
    expect(events()).toEqual([{ at: "2026-10-11T04:58:00.000Z", event: "merged", sha: "9b0c1d2", detail: "merge · 9b0c1d2" }]);
  });

  test("not green: refuses with what blocks it and never PUTs", async () => {
    setup();
    const { stub, runner } = gh({ checks: [check({ name: "E2E Tests", bucket: "fail" })] });
    expect(await merge(["921"], runner)).toBe("pr merge: not green — E2E Tests failed");
    expect(stub.calls.some((call) => call[2] === "-X")).toBe(false);
  });

  test("--now merges whatever the checks say; --method beats pr.merge", async () => {
    setup();
    const { stub, runner } = gh({ checks: [check({ name: "E2E Tests", bucket: "running" })] }, [merged()]);
    expect(await merge(["921", "--now", "--method", "squash"], runner)).toBe("Merged: #921 · squash · 9b0c1d2");
    expect(stub.calls.find((call) => call[2] === "-X")).toContain("merge_method=squash");
    expect(onMain()).toContain("PR #921 merged 2026-10-10 as 9b0c1d2 (squash).");
  });

  test("no method anywhere: refuses naming the setting", async () => {
    setup("---\npr:\n  draft: true\n---\n");
    const { runner } = gh({ checks: [check()] });
    expect(await merge(["921"], runner)).toBe("pr merge: pr.merge is not set; pass --method or set it in docs/specs/_playbook/settings.md");
  });

  test("head moved: GitHub's 409 is the refusal and nothing lands on main", async () => {
    setup();
    const before = mainCommits();
    const message = "Head branch was modified. Review and try the merge again.";
    const { runner } = gh({ checks: GREEN }, [put({ code: 1, stdout: fixture("gh-merge-409.json"), stderr: `gh: ${message} (HTTP 409)\n` })]);
    expect(await merge(["921"], runner)).toBe(`pr merge: GitHub refused (409) — ${message}`);
    expect(mainCommits()).toBe(before);
    expect(events()).toEqual([]);
  });

  test("landing refused: the merge stands and the last line says the line didn't land", async () => {
    setup();
    const hook = join(repo.origin, "hooks", "pre-receive");
    writeFileSync(hook, "#!/bin/sh\necho 'protected branch' >&2\nexit 1\n");
    chmodSync(hook, 0o755);
    const { runner } = gh({ checks: GREEN }, [merged()]);
    const lines = (await merge(["921"], runner)).split("\n");
    expect(lines[0]).toBe("Merged: #921 · merge · 9b0c1d2");
    expect(lines.at(-1)).toMatch(/^pr merge: merged; merge line not landed — push to main refused: .*declined/);
  });

  test("already merged: lands a missing line once, then changes nothing", async () => {
    setup();
    const { stub, runner } = gh({ state: "MERGED", mergeCommit: MERGE_SHA });
    expect(await merge(["921"], runner)).toBe("Merged: #921 · merge · 9b0c1d2");
    const after = mainCommits();
    expect(await merge(["921"], gh({ state: "MERGED", mergeCommit: MERGE_SHA }).runner)).toBe("Merged: #921 · merge · 9b0c1d2");
    expect(mainCommits()).toBe(after);
    expect(onMain().split(LINE)).toHaveLength(2);
    expect(stub.calls.some((call) => call[2] === "-X")).toBe(false);
  });

  test("a closed PR is refused; bad args print usage; the pr group routes merge", async () => {
    setup();
    expect(await merge(["921"], gh({ state: "CLOSED" }).runner)).toBe("pr merge: #921 is closed, not merged");
    expect(await prMerge(tree.dir, ["--method", "fast-forward"])).toBe("pr merge: --method takes squash, merge or rebase");
    expect(await prMerge(tree.dir, ["a", "b", "c"])).toBe(`usage: ${PR_MERGE_USAGE}`);
    expect(await prCommand(tree.dir, ["merge", "a", "b", "c"])).toBe(`usage: ${PR_MERGE_USAGE}`);
  });
});
