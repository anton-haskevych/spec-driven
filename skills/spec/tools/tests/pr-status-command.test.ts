import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PR_USAGE, prCommand } from "../commands/pr";
import { prStatus } from "../commands/pr/status";
import { specPrNumbers } from "../pr/resolve";
import { check, prView } from "./pr-factories";
import { stubRunner } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const view = (number: number, state: string) => JSON.stringify(prView({ number, state, headRefOid: "abcdef0123" }));
const GIT_MAIN = [["git", "symbolic-ref"], { stdout: "origin/main\n" }] as const;

describe("specPrNumbers", () => {
  test("reads PR #n and /pull/n links from the Spec state section only, in order", () => {
    const text = "# PR Opening\n\n## Spec state\n\nPR A merged (PR #779). PR B: https://github.com/acme/app/pull/801 · PR #779 again\n\n## Pre-PR checks\n\n- [ ] PR #999 is not a spec link\n";
    expect(specPrNumbers(text)).toEqual([779, 801]);
  });
});

describe("pr status", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  test("a PR number goes straight to gh; the verdict line follows the header", () => {
    tree = createTree();
    const runner = stubRunner([[["gh", "pr", "view", "871"], { stdout: view(871, "MERGED") }], GIT_MAIN]);
    expect(prStatus(tree.root, ["#871"], runner).split("\n").slice(0, 2)).toEqual([
      "PR #871 merged · mergeable CLEAN · head abcdef0",
      "verdict: merged",
    ]);
  });

  test("with a spec name it reports the last open PR and names the others", () => {
    tree = createTree();
    tree.spec("billing", { "pr-opening.md": "## Spec state\n\nPR #779 merged, PR #801 open, PR #812 closed.\n" });
    const runner = stubRunner([
      [["gh", "pr", "view", "812"], { stdout: view(812, "CLOSED") }],
      [["gh", "pr", "view", "801"], { stdout: view(801, "OPEN") }],
      GIT_MAIN,
    ]);
    const lines = prStatus(tree.root, ["billing"], runner).split("\n");
    expect(lines[0]).toStartWith("PR #801 ready");
    expect(lines.at(-1)).toBe("other PRs in this spec: #779, #812");
  });

  test("no argument uses the current branch's PR; failures are one plain line", () => {
    tree = createTree();
    tree.spec("empty", { "pr-opening.md": "## Spec state\n\nNo PR yet.\n" });
    const noPr = stubRunner([[["gh", "pr", "view"], { code: 1, stderr: 'no pull requests found for branch "feat/x"' }]]);
    expect(prStatus(tree.root, [], noPr)).toBe('pr status: no pull requests found for branch "feat/x"');
    expect(prStatus(tree.root, ["empty"], noPr)).toBe('pr status: no pull requests found for branch "feat/x"; pr-opening.md for empty links no PR');
    expect(prStatus(tree.root, ["nope"], noPr)).toBe("pr status: no spec named nope");
  });

  test("a failed job's log is saved under the clone's babysit folder; the triage gate comes from settings", () => {
    tree = createTree();
    tree.write("docs/specs/_playbook/settings.md", "---\ngates:\n  ci-triage: ci-triage\n---\n");
    const failed = check({ name: "E2E Tests", bucket: "fail", link: "https://github.com/acme/app/actions/runs/3788/job/9921" });
    const runner = stubRunner([
      [["gh", "pr", "view", "921"], { stdout: JSON.stringify({ ...JSON.parse(view(921, "OPEN")), statusCheckRollup: [{ name: "E2E Tests", workflowName: "CI", status: "COMPLETED", conclusion: "FAILURE", detailsUrl: failed.link }] }) }],
      [["gh", "api"], { stdout: "##[error]boom\n" }],
      [["gh", "run", "view"], { stdout: JSON.stringify({ status: "completed", conclusion: "failure", attempt: 1, jobs: [{ databaseId: 9921, name: "E2E Tests", conclusion: "failure" }] }) }],
      [["git", "rev-parse"], { stdout: `${join(tree.root, ".git")}\n` }],
    ]);
    const saved = join(tree.root, ".git", "spec-board", "babysit", "pr-921", "job-9921.log");
    const lines = prStatus(tree.root, ["921"], runner).split("\n");
    expect(lines).toContain(`         log ${saved}`);
    expect(lines).toContain("triage   gate ci-triage (gates.ci-triage)");
    expect(existsSync(saved)).toBe(true);
  });

  test("the pr group dispatches status and lists its usage otherwise", async () => {
    tree = createTree();
    expect(await prCommand(tree.root, ["nope"])).toBe(`usage: ${PR_USAGE}`);
    expect(PR_USAGE).toStartWith("pr status [<pr> | <spec-name> [<group>]] | pr log ");
    expect(await prCommand(tree.root, [])).toBe(`usage: ${PR_USAGE}`);
  });
});
