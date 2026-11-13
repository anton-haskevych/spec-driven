import { afterEach, describe, expect, test } from "bun:test";
import { loadNodes } from "../graph/nodes";
import { readSpecFields } from "../graph/spec-fields";
import { planSourceOf } from "../plan/read-plans";
import { phaseDocPath, specDocPath } from "../plan/kinds";
import { viewOf } from "./fake-record";
import { cardDoc, phaseDoc, specDoc } from "./record-factories";
import { createTree, type Tree } from "./tree";

const FILE_META = "---\nstatus: active\nowner: Taras\nfocus: could\nship: auto\npriority: p1\nrelated:\n  - beta: shares a table\n---\n# Alpha\n";

let tree: Tree | undefined;
afterEach(() => tree?.cleanup());

function record(layout: number, fields: object = {}) {
  return planSourceOf({ kind: "read", view: viewOf({ [specDocPath("alpha")]: specDoc({ name: "alpha", layout, ...fields }), [phaseDocPath("alpha", "1")]: phaseDoc() }), live: true });
}

describe("readSpecFields", () => {
  test("files alone: what CLAUDE.md says", () => {
    tree = createTree();
    const folder = tree.spec("alpha", { "CLAUDE.md": FILE_META });
    expect(readSpecFields(folder.dir)).toMatchObject({ status: "active", title: "Alpha", meta: { owner: "Taras", focus: "could", ship: "auto", priority: "p1" } });
  });

  test("the record's four fields win, even when it leaves one unset; the rest stay the file's", () => {
    tree = createTree();
    const folder = tree.spec("alpha", { "CLAUDE.md": FILE_META });
    const fields = readSpecFields(folder.dir, { status: "paused", focus: "must" });
    expect(fields).toMatchObject({ status: "paused", meta: { focus: "must", priority: "p1" } });
    expect(fields.meta.owner).toBeUndefined();
    expect(fields.meta.ship).toBeUndefined();
    expect(fields.relations).toEqual([{ type: "related", target: "beta", note: "shares a table" }]);
  });
});

describe("loadNodes on a joined spec", () => {
  test("reads the fields from the record once the spec is upgraded, from its files before", () => {
    tree = createTree();
    tree.spec("alpha", { "CLAUDE.md": FILE_META });
    expect(loadNodes(tree.root, record(2, { status: "done", owner: "Anton" })).get("alpha")).toMatchObject({ status: "done", meta: { owner: "Anton" } });
    expect(loadNodes(tree.root, record(1, { status: "done", owner: "Anton" })).get("alpha")).toMatchObject({ status: "active", meta: { owner: "Taras" } });
  });
});

describe("a spec's priority and due date", () => {
  const covering = { "cards/0/c1.json": cardDoc({ id: "c1", priority: "p0", due: "2026-12-01", coveredBy: ["alpha#1"] }) };
  const withCards = (docs: Record<string, unknown>) => planSourceOf({ kind: "read", view: viewOf(docs), live: true });

  test("come from the cards that cover it, for a spec in files and one upgraded to layout 4", () => {
    tree = createTree();
    tree.spec("alpha", { "CLAUDE.md": FILE_META });
    expect(loadNodes(tree.root, withCards(covering)).get("alpha")?.meta).toMatchObject({ priority: "p0", due: "2026-12-01" });
    const joined = { ...covering, [specDocPath("alpha")]: specDoc({ name: "alpha", layout: 4 }), [phaseDocPath("alpha", "1")]: phaseDoc() };
    expect(loadNodes(tree.root, withCards(joined)).get("alpha")?.meta).toMatchObject({ priority: "p0", due: "2026-12-01" });
  });

  test("a covering card without them leaves the spec without them", () => {
    tree = createTree();
    tree.spec("alpha", { "CLAUDE.md": FILE_META });
    const bare = { "cards/0/c1.json": cardDoc({ id: "c1", coveredBy: ["alpha"] }) };
    expect(loadNodes(tree.root, withCards(bare)).get("alpha")?.meta.priority).toBeUndefined();
  });

  test("with no covering card, or joined before layout 4, CLAUDE.md still says", () => {
    tree = createTree();
    tree.spec("alpha", { "CLAUDE.md": FILE_META });
    expect(loadNodes(tree.root, withCards({})).get("alpha")?.meta.priority).toBe("p1");
    const behind = { ...covering, [specDocPath("alpha")]: specDoc({ name: "alpha", layout: 3 }), [phaseDocPath("alpha", "1")]: phaseDoc() };
    expect(loadNodes(tree.root, withCards(behind)).get("alpha")?.meta.priority).toBe("p1");
  });
});
