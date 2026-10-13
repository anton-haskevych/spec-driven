import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunOptions, RunResult, Runner } from "../core/run";
import { holdPr, withHowToReview, HOLD_LABEL } from "../pr/actions/hold";
import { ghWrites } from "../pr/actions/gh-writes";
import { prCommand } from "../commands/pr";
import { PR_HOLD_USAGE } from "../commands/pr/hold";
import { ghPrViewJson } from "./pr-factories";
import { createTree, type Tree } from "./tree";

type Canned = ReadonlyArray<readonly [prefix: readonly string[], reply: Partial<RunResult>]>;

function recorder(canned: Canned): Runner & { calls: { argv: string[]; stdin?: string }[] } {
  const calls: { argv: string[]; stdin?: string }[] = [];
  return {
    calls,
    run(argv, options?: RunOptions) {
      calls.push({ argv: [...argv], ...(options?.stdin === undefined ? {} : { stdin: options.stdin }) });
      const match = canned.find(([prefix]) => prefix.every((part, index) => argv[index] === part));
      return match ? { code: 0, stdout: "", stderr: "", ...match[1] } : { code: 1, stdout: "", stderr: "no canned result" };
    },
  };
}

const SECTION = "## How to review\n1. pnpm dev:all\n2. Log in as owner@demo\n";

describe("withHowToReview", () => {
  test("appends the section after the body", () => {
    expect(withHowToReview("- Invoices go out\n\nSpec: docs/specs/billing/\n", SECTION)).toBe(`- Invoices go out\n\nSpec: docs/specs/billing/\n\n${SECTION}`);
  });

  test("replaces an existing section, keeping what follows it", () => {
    const body = "- Invoices\n\n## How to review\nold steps\n\n## Notes\nkeep me\n";
    expect(withHowToReview(body, SECTION)).toBe(`- Invoices\n\n${SECTION}\n## Notes\nkeep me\n`);
  });

  test("an empty body is just the section", () => {
    expect(withHowToReview("", SECTION)).toBe(SECTION);
  });
});

describe("ghWrites hold calls", () => {
  test("label creates the label if missing, then adds it to the PR", () => {
    const runner = recorder([[["gh"], {}]]);
    expect(ghWrites("/repo", runner).label(921, HOLD_LABEL)).toEqual({ ok: true, value: undefined });
    expect(runner.calls.map((call) => call.argv.slice(0, 5))).toEqual([
      ["gh", "label", "create", "hold-for-review", "--force"],
      ["gh", "pr", "edit", "921", "--add-label"],
    ]);
  });

  test("a failed body read is a failure, never an empty body", () => {
    const runner = recorder([[["gh", "api"], { code: 1, stderr: "HTTP 502\n" }]]);
    expect(ghWrites("/repo", runner).body(921)).toEqual({ ok: false, reason: "HTTP 502" });
  });

  test("setBody sends the text on stdin", () => {
    const runner = recorder([[["gh", "pr", "edit"], {}]]);
    ghWrites("/repo", runner).setBody(921, "new body");
    expect(runner.calls).toEqual([{ argv: ["gh", "pr", "edit", "921", "--body-file", "-"], stdin: "new body" }]);
  });
});

describe("holdPr", () => {
  let tree: Tree;
  afterEach(() => tree?.cleanup());

  function setup(state: "OPEN" | "MERGED" = "OPEN", bodyReply: Partial<RunResult> = { stdout: "- Invoices go out\n" }) {
    tree = createTree();
    const file = join(tree.root, "how.md");
    writeFileSync(file, "1. pnpm dev:all\n2. Log in as owner@demo\n");
    const runner = recorder([
      [["gh", "pr", "view", "921"], { stdout: ghPrViewJson({ number: 921, state }) }],
      [["gh", "api"], bodyReply],
      [["gh", "label"], {}],
      [["gh", "pr", "edit"], {}],
    ]);
    return { runner, file };
  }

  test("labels the PR and writes How to review, with a heading added when the file has none", () => {
    const { runner, file } = setup();
    expect(holdPr(tree.root, { target: ["921"], howToReview: file }, { runner })).toBe("Held: #921 · label hold-for-review · How to review in the PR");
    expect(runner.calls.find((call) => call.argv.includes("--body-file"))?.stdin).toBe(`- Invoices go out\n\n${SECTION}`);
  });

  test("a PR that isn't open is refused before anything is written", () => {
    const { runner, file } = setup("MERGED");
    expect(holdPr(tree.root, { target: ["921"], howToReview: file }, { runner })).toBe("pr hold: #921 is merged");
    expect(runner.calls.some((call) => call.argv[2] === "edit" || call.argv[1] === "label")).toBe(false);
  });

  test("a body that can't be read leaves the PR untouched", () => {
    const { runner, file } = setup("OPEN", { code: 1, stderr: "HTTP 502\n" });
    expect(holdPr(tree.root, { target: ["921"], howToReview: file }, { runner })).toBe("pr hold: HTTP 502");
    expect(runner.calls.some((call) => call.argv[2] === "edit")).toBe(false);
  });

  test("the command needs --how-to-review with a file that exists", async () => {
    tree = createTree();
    expect(await prCommand(tree.root, ["hold", "921"])).toBe(`usage: ${PR_HOLD_USAGE}`);
    expect(await prCommand(tree.root, ["hold", "921", "--how-to-review", "nope.md"])).toBe("pr hold: no file nope.md");
  });
});
