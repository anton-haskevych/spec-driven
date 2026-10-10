import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunOptions } from "../core/run";
import { ghWrites, GH_WRITE_BUDGET } from "../pr/actions/gh-writes";
import { GH_TIMEOUT_MS } from "../pr/gh-lists";
import { stubRunner } from "./stub-runner";

const NEW_PR = { base: "main", head: "feat/billing-pr-a", title: "billing: Invoices", body: "- Invoices go out\n\nSpec: docs/specs/billing/", draft: false };

describe("ghWrites.create", () => {
  test("reads the PR number and url gh prints, and passes title, body and base", () => {
    const runner = stubRunner([[["gh", "pr", "create"], { stdout: "https://github.com/acme/app/pull/921\n", stderr: "Warning: 1 uncommitted change\n" }]]);
    expect(ghWrites("/repo", runner).create(NEW_PR)).toEqual({ ok: true, value: { number: 921, url: "https://github.com/acme/app/pull/921" } });
    expect(runner.calls[0]).toEqual(["gh", "pr", "create", "--base", "main", "--head", "feat/billing-pr-a", "--title", "billing: Invoices", "--body", NEW_PR.body]);
  });

  test("--draft only when asked", () => {
    const runner = stubRunner([[["gh", "pr", "create"], { stdout: "https://github.com/acme/app/pull/922\n" }]]);
    ghWrites("/repo", runner).create({ ...NEW_PR, draft: true });
    expect(runner.calls[0]?.at(-1)).toBe("--draft");
  });

  test("a non-zero exit is a failure even when stdout is a valid JSON error body", () => {
    const body = JSON.stringify({ message: "Validation Failed: a pull request already exists for acme:feat/billing-pr-a", documentation_url: "https://docs.github.com" });
    const runner = stubRunner([[["gh", "pr", "create"], { code: 1, stdout: body, stderr: "" }]]);
    expect(ghWrites("/repo", runner).create(NEW_PR)).toEqual({ ok: false, reason: "Validation Failed: a pull request already exists for acme:feat/billing-pr-a" });
  });

  test("a failure without a JSON body names stderr's first line, else the exit code", () => {
    const stderr = stubRunner([[["gh", "pr", "create"], { code: 1, stderr: "must first push the current branch to a remote\nhint: …" }]]);
    expect(ghWrites("/repo", stderr).create(NEW_PR)).toEqual({ ok: false, reason: "must first push the current branch to a remote" });
    const silent = stubRunner([[["gh", "pr", "create"], { code: 4 }]]);
    expect(ghWrites("/repo", silent).create(NEW_PR)).toEqual({ ok: false, reason: "gh pr create exited 4" });
  });

  test("exit 0 without a PR url is a failure, not a guess", () => {
    const runner = stubRunner([[["gh", "pr", "create"], { stdout: "Creating pull request…\n" }]]);
    expect(ghWrites("/repo", runner).create(NEW_PR)).toEqual({ ok: false, reason: "gh pr create printed no PR url" });
  });
});

describe("ghWrites.ready", () => {
  test("marks the PR ready and reports gh's refusal", () => {
    const ok = stubRunner([[["gh", "pr", "ready", "921"], { stdout: "✓ Pull request #921 is marked as \"ready for review\"\n" }]]);
    expect(ghWrites("/repo", ok).ready(921)).toEqual({ ok: true, value: undefined });
    const refused = stubRunner([[["gh", "pr", "ready", "921"], { code: 1, stderr: "GraphQL: Pull request #921 is closed\n" }]]);
    expect(ghWrites("/repo", refused).ready(921)).toEqual({ ok: false, reason: "GraphQL: Pull request #921 is closed" });
  });
});

const fixture = (name: string) => readFileSync(join(import.meta.dir, "fixtures", name), "utf8");
const SHA = "08bb7dbd47fa14537ef4";

describe("ghWrites.merge", () => {
  test("PUTs the method pinned to the head and reads the merge commit", () => {
    const runner = stubRunner([[["gh", "api"], { stdout: fixture("gh-merge-200.json") }]]);
    expect(ghWrites("/repo", runner).merge(921, "merge", SHA)).toEqual({ merged: true, sha: "9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c" });
    expect(runner.calls[0]).toEqual(["gh", "api", "-X", "PUT", "repos/{owner}/{repo}/pulls/921/merge", "-f", "merge_method=merge", "-f", `sha=${SHA}`]);
  });

  test.each([
    ["gh-merge-405.json", 405, "Pull Request is not mergeable"],
    ["gh-merge-409.json", 409, "Head branch was modified. Review and try the merge again."],
  ])("a refused merge (%s) is not merged, even though its body is valid JSON", (name, status, message) => {
    const runner = stubRunner([[["gh", "api"], { code: 1, stdout: fixture(name), stderr: `gh: ${message} (HTTP ${status})\n` }]]);
    expect(ghWrites("/repo", runner).merge(921, "squash", SHA)).toEqual({ merged: false, status, message });
  });

  test("the status comes from gh's stderr when the body has none, and is absent when nothing names one", () => {
    const body = JSON.stringify({ message: "Base branch was modified. Review and try the merge again." });
    const fromStderr = stubRunner([[["gh", "api"], { code: 1, stdout: body, stderr: "gh: Base branch was modified. (HTTP 405)\n" }]]);
    expect(ghWrites("/repo", fromStderr).merge(921, "merge", SHA)).toEqual({ merged: false, status: 405, message: "Base branch was modified. Review and try the merge again." });
    const offline = stubRunner([[["gh", "api"], { code: 1, stderr: "error connecting to api.github.com\n" }]]);
    expect(ghWrites("/repo", offline).merge(921, "merge", SHA)).toEqual({ merged: false, message: "error connecting to api.github.com" });
  });

  test("exit 0 without merged: true is not a merge", () => {
    const runner = stubRunner([[["gh", "api"], { stdout: "{}" }]]);
    expect(ghWrites("/repo", runner).merge(921, "merge", SHA)).toEqual({ merged: false, message: "GitHub's merge reply had no merge commit" });
  });
});

describe("ghWrites limits", () => {
  test("every call runs in the repo with GH_TIMEOUT_MS", () => {
    const seen: Array<RunOptions | undefined> = [];
    const runner = { run: (_argv: readonly string[], options?: RunOptions) => (seen.push(options), { code: 0, stdout: "", stderr: "" }) };
    ghWrites("/repo", runner).ready(1);
    expect(seen).toEqual([{ cwd: "/repo", timeoutMs: GH_TIMEOUT_MS }]);
  });

  test("refuses once its own budget is spent", () => {
    const runner = stubRunner([[["gh", "pr", "ready"], {}]]);
    const writes = ghWrites("/repo", runner, 2);
    writes.ready(1);
    writes.ready(1);
    expect(writes.ready(1)).toEqual({ ok: false, reason: "gh write budget (2) spent" });
    expect(runner.calls).toHaveLength(2);
    expect(GH_WRITE_BUDGET).toBe(10);
  });
});
