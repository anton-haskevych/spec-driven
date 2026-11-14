import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { questionDocPath } from "../plan/kinds";
import { RECORD_LAYOUT } from "../record/layout";
import { fakeCheckout, phaseDeps } from "./command-deps";
import { commitLog, docOf, seedRecord } from "./fake-record";
import { ALPHA_PHASES, joinedDocs } from "./record-factories";
import { createTree, joinedFiles, withSettings, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

describe("command deps on fakes", () => {
  test("a record write runs end to end with no repo: phase park asks its question on the fake record", async () => {
    tree = createTree("command-deps-");
    withSettings(tree);
    joinedFiles(tree, ALPHA_PHASES);
    const checkout = fakeCheckout({ commonDir: join(tree.root, ".git") });
    seedRecord(checkout.record, joinedDocs("alpha", ALPHA_PHASES, { layout: RECORD_LAYOUT }));
    const deps = phaseDeps({ runner: checkout.runner, seams: checkout.seams, env: {} });
    const line = await phaseCommand(tree.root, ["park", "alpha", "2", "Which way?", "--recommend", "left"], undefined, deps);
    expect(line).toBe('question: q1 open on phase 2 — "Which way?" · recommend: left\nHand off; the board shows the question.');
    expect(commitLog(checkout.record)[0]).toBe("record: ask alpha q1");
    expect(docOf(checkout.record, questionDocPath("alpha", "q1"))).toMatchObject({ about: "alpha#2", question: "Which way?" });
  });
});
