import { afterEach, expect, test } from "bun:test";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readClaimDocuments } from "../claims/read-documents";
import { claim } from "./factories";
import { createTree, type Tree } from "./tree";

const claude = { runtime: "claude", key: "bound-home" } as const;
const codex = { runtime: "codex", key: "bound-daemon" } as const;
let tree: Tree;
afterEach(() => tree?.cleanup());

test("reads legacy and qualified documents in filename order, preserving original bytes and extensions", () => {
  tree = createTree("qualified-claims-");
  const legacy = { ...claim({ spec: "a", phase: "2" }), extra: { keep: "legacy" } };
  const versioned = { schemaVersion: 1, spec: "b", phase: "3", ref: { source: codex, id: "native" },
    workspace: "/tree", claimedAt: "now", extra: { keep: "qualified" } };
  const texts = [JSON.stringify(legacy, null, 2) + "\n", JSON.stringify(versioned)] as const;
  tree.write("b#3.json", texts[1]);
  tree.write("a#2.json", texts[0]);
  tree.write("a#2.json.tmp-mid-write", "half");
  const result = readClaimDocuments(tree.root, claude);
  expect(result.ok && result.value.map(({ record }) => record)).toEqual([legacy, versioned]);
  expect(result.ok && result.value.map(({ claim }) => claim.ref.source)).toEqual([claude, codex]);
  expect(readFileSync(join(tree.root, "a#2.json"), "utf8")).toBe(texts[0]);
  expect(readFileSync(join(tree.root, "b#3.json"), "utf8")).toBe(texts[1]);
  expect(readdirSync(tree.root).sort()).toEqual(["a#2.json", "a#2.json.tmp-mid-write", "b#3.json"]);
});

test("a genuinely missing directory is empty without creating storage", () => {
  tree = createTree("qualified-claims-");
  expect(readClaimDocuments(join(tree.root, "missing"), claude)).toEqual({ ok: true, value: [] });
  expect(readdirSync(tree.root)).toEqual([]);
});

test("unbound legacy, malformed and unknown-version rows refuse the entire read", () => {
  tree = createTree("qualified-claims-");
  for (const text of [JSON.stringify(claim()), "{half", JSON.stringify({ ...claim(), schemaVersion: 99 })]) {
    tree.write("alpha#1.json", text);
    const result = readClaimDocuments(tree.root);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("alpha#1.json");
  }
});

test("a filename/claim target mismatch cannot silently leave another phase free", () => {
  tree = createTree("qualified-claims-");
  tree.write("alpha#9.json", JSON.stringify(claim({ spec: "alpha", phase: "2" })));
  expect(readClaimDocuments(tree.root, claude)).toEqual({ ok: false, reason: "claim alpha#9.json: filename does not match stored target" });
});

test("filesystem failures are errors, not empty or partial claim sets", () => {
  tree = createTree("qualified-claims-");
  tree.write("not-a-directory", "file");
  expect(readClaimDocuments(join(tree.root, "not-a-directory"), claude).ok).toBe(false);
  tree.write("alpha#1.json", JSON.stringify(claim()));
  mkdirSync(join(tree.root, "broken#2.json"));
  const result = readClaimDocuments(tree.root, claude);
  expect(result.ok).toBe(false);
  expect(!result.ok && result.reason).toContain("broken#2.json");
});
