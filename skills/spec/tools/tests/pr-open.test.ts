import { afterEach, describe, expect, test } from "bun:test";
import { prCommand } from "../commands/pr";
import { prOpen } from "../commands/pr/open";
import { gitAt, stateDir } from "../core/git";
import { specStateFrom } from "../core/spec-state";
import type { RunResult } from "../core/run";
import { readEvents } from "../pr/babysit/log";
import { prBody, prTitle } from "../pr/actions/pr-text";
import { pickGroup } from "../pr/groups";
import { fakeClock } from "./fake-clock";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { phasedSpecFiles, prView, type PhaseSketch } from "./pr-factories";
import { routeGh, sequencedRunner } from "./stub-runner";

const PHASES: PhaseSketch[] = [
  { id: "1", title: "Invoices", pr: "A", outcome: "Studios send invoices without a spreadsheet. Low risk." },
  { id: "2", title: "Reminders", pr: "B", outcome: "Late payers get one reminder." },
  { id: "3", title: "Receipts", pr: "A" },
];
const URL = "https://github.com/acme/app/pull/921";

function groupOf(phases: readonly PhaseSketch[], name: string) {
  const files = phasedSpecFiles(phases);
  const picked = pickGroup(specStateFrom({ name: "billing", dir: "/x" }, (path) => files[path]), name);
  if (!picked.ok) throw new Error(picked.reason);
  return picked.value;
}

describe("prTitle and prBody", () => {
  test("the body is one bullet per group phase: its Outcome, else its Goal; then the spec folder", () => {
    expect(prBody("docs/specs/billing", groupOf(PHASES, "A"))).toBe(
      "- Studios send invoices without a spreadsheet. Low risk.\n- Build Receipts.\n\nSpec: docs/specs/billing/",
    );
  });

  test("the title names the first phase and counts the rest", () => {
    expect(prTitle("billing", groupOf(PHASES, "A"))).toBe("billing: Invoices (+1 more)");
    expect(prTitle("billing", groupOf(PHASES, "B"))).toBe("billing: Reminders");
  });
});

describe("pr open", () => {
  let repo: TestRepo;
  afterEach(() => repo?.cleanup());

  function groupTree(branch = "feat/billing-pr-a"): WorkingCopy {
    repo = repoWithOrigin("spec-pr-open-");
    for (const [path, text] of Object.entries({ "CLAUDE.md": "---\nstatus: active\n---\n", ...phasedSpecFiles(PHASES) })) repo.write(`docs/specs/billing/${path}`, text);
    repo.commitAll("spec");
    repo.git("push", "-q", "origin", "main");
    const tree = repo.addWorktree("tree", branch);
    tree.write("src/invoice.ts", "export {};\n");
    tree.commitAll("invoices");
    return tree;
  }

  function gh(replies: Reply[]) {
    const stub = sequencedRunner([[["gh", "repo", "view"], [{ stdout: "main\n" }]], ...replies]);
    return { stub, runner: routeGh(stub, isolatedRunner) };
  }
  type Reply = [readonly string[], Partial<RunResult>[]];
  const noPr = (): Reply => [["gh", "pr", "view", "feat/billing-pr-a"], [{ code: 1, stderr: 'no pull requests found for branch "feat/billing-pr-a"' }]];
  const created = (): Reply => [["gh", "pr", "create"], [{ stdout: `${URL}\n` }]];
  const open = (dir: string, args: string[], runner: ReturnType<typeof gh>["runner"], clock = fakeClock()) =>
    prOpen(dir, args, { runner, clock, now: () => new Date("2026-10-11T04:06:30Z") });
  const events = (dir: string) => {
    const logDir = stateDir(gitAt(dir, isolatedRunner), "babysit");
    return logDir.ok ? readEvents(logDir.value, 921).events : [];
  };

  test("no PR yet: pushes the group branch, opens it ready with the Outcome body, logs opened", async () => {
    const tree = groupTree();
    const { stub, runner } = gh([noPr(), created()]);
    expect(await open(tree.dir, ["billing", "a"], runner)).toBe(`PR: #921 opened ready · ${URL}`);
    expect(repo.git("ls-remote", "origin", "feat/billing-pr-a")).toContain(tree.git("rev-parse", "HEAD"));
    const create = stub.calls.find((call) => call[2] === "create")!;
    expect(create.slice(0, 9)).toEqual(["gh", "pr", "create", "--base", "main", "--head", "feat/billing-pr-a", "--title", "billing: Invoices (+1 more)"]);
    expect(create[10]).toEndWith("Spec: docs/specs/billing/");
    const head = tree.git("rev-parse", "--short=7", "HEAD");
    expect(events(tree.dir)).toEqual([{ at: "2026-10-11T04:06:30.000Z", event: "opened", sha: head, detail: `ready · head ${head}` }]);
  });

  test("--draft opens a draft", async () => {
    const tree = groupTree();
    const { stub, runner } = gh([noPr(), created()]);
    expect(await open(tree.dir, ["billing", "A", "--draft"], runner)).toBe(`PR: #921 opened as a draft · ${URL}`);
    expect(stub.calls.find((call) => call[2] === "create")?.at(-1)).toBe("--draft");
  });

  test("an open, ready PR is reported, never created again", async () => {
    const tree = groupTree();
    const { stub, runner } = gh([[["gh", "pr", "view", "feat/billing-pr-a"], [{ stdout: JSON.stringify(prView({ number: 921, url: URL })) }]]]);
    expect(await open(tree.dir, ["billing", "A"], runner)).toBe(`PR: #921 already open · ${URL}`);
    expect(stub.calls.some((call) => call[2] === "create" || call[2] === "ready")).toBe(false);
  });

  test("an existing draft is marked ready race-safely and the CI start is logged", async () => {
    const tree = groupTree();
    const draft = prView({ number: 921, isDraft: true, headRefOid: "1a2b3c4d5e", url: URL });
    const runs = (ids: number[]) => ({ stdout: JSON.stringify(ids.map((id) => ({ databaseId: id, status: "queued", conclusion: "" }))) });
    const { stub, runner } = gh([
      [["gh", "pr", "view", "feat/billing-pr-a"], [{ stdout: JSON.stringify(draft) }]],
      [["gh", "run", "list", "--commit", "1a2b3c4d5e"], [runs([3787]), runs([3787, 3788])]],
      [["gh", "pr", "ready", "921"], [{}]],
      [["gh", "run", "view"], [{ stdout: JSON.stringify({ jobs: [] }) }]],
    ]);
    expect(await open(tree.dir, ["billing", "A"], runner)).toBe("PR: #921 marked ready · CI started (run 3788)");
    expect(stub.calls.findIndex((call) => call[2] === "ready")).toBeGreaterThan(stub.calls.findIndex((call) => call[2] === "list"));
    expect(events(tree.dir)).toMatchObject([{ event: "ready", sha: "1a2b3c4", detail: "CI started (run 3788)" }]);
  });

  test("CI that skipped itself says to push a new commit", async () => {
    const tree = groupTree();
    const draft = prView({ number: 921, isDraft: true, headRefOid: "1a2b3c4d5e", url: URL });
    const runs = (ids: number[]) => ({ stdout: JSON.stringify(ids.map((id) => ({ databaseId: id, status: "completed", conclusion: "success" }))) });
    const { runner } = gh([
      [["gh", "pr", "view", "feat/billing-pr-a"], [{ stdout: JSON.stringify(draft) }]],
      [["gh", "run", "list"], [runs([3787]), runs([3787, 3788])]],
      [["gh", "pr", "ready"], [{}]],
      [["gh", "run", "view"], [{ stdout: JSON.stringify({ jobs: [{ databaseId: 1, name: "prepare", conclusion: "skipped" }] }) }]],
    ]);
    expect(await open(tree.dir, ["billing", "A"], runner)).toBe("PR: #921 marked ready · CI skipped on 1a2b3c4 — push a new commit");
  });

  test("an existing draft with --draft is reported as is", async () => {
    const tree = groupTree();
    const { runner } = gh([[["gh", "pr", "view", "feat/billing-pr-a"], [{ stdout: JSON.stringify(prView({ number: 921, isDraft: true, url: URL })) }]]]);
    expect(await open(tree.dir, ["billing", "A", "--draft"], runner)).toBe(`PR: #921 already open as a draft · ${URL}`);
  });

  test("refuses from a tree on another branch, before pushing anything", async () => {
    const tree = groupTree("feat/something-else");
    const { stub, runner } = gh([noPr(), created()]);
    expect(await open(tree.dir, ["billing", "A"], runner)).toBe("pr open: this tree is on feat/something-else, not feat/billing-pr-a — run it in that branch's tree");
    expect(repo.git("ls-remote", "origin", "feat/something-else")).toBe("");
    expect(stub.calls.some((call) => call[2] === "create")).toBe(false);
  });

  test("a spec with several groups needs the group named; usage on bad args", async () => {
    const tree = groupTree();
    const { runner } = gh([]);
    expect(await open(tree.dir, ["billing"], runner)).toBe("pr open: billing has PR groups A, B — name one");
    expect(await open(tree.dir, [], runner)).toBe("usage: pr open <spec-name> [<group>] [--draft]");
    expect(await prCommand(tree.dir, ["open", "billing", "A", "B", "C"])).toBe("usage: pr open <spec-name> [<group>] [--draft]");
  });

  test("gh refusing the create is the result line", async () => {
    const tree = groupTree();
    const { runner } = gh([noPr(), [["gh", "pr", "create"], [{ code: 1, stdout: JSON.stringify({ message: "Validation Failed: No commits between main and feat/billing-pr-a" }) }]]]);
    expect(await open(tree.dir, ["billing", "A"], runner)).toBe("pr open: Validation Failed: No commits between main and feat/billing-pr-a");
  });
});
