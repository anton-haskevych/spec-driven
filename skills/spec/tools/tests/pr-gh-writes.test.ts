import { describe, expect, test } from "bun:test";
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
