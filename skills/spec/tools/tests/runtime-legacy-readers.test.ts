import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { claimStatus, isStale, type ClaimContext } from "./fixtures/runtime-2.51.0/claims/rules";
import { loadClaims, releaseClaims, takeClaim } from "./fixtures/runtime-2.51.0/claims/store";
import { findPrunable } from "./fixtures/runtime-2.51.0/trees/prune";
import { claim } from "./factories";
import { isolatedAsyncRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";
import { cannedGh } from "./stub-runner";
import { createTree, type Tree } from "./tree";

const fixtureDir = join(import.meta.dir, "fixtures/runtime-2.51.0");
interface Manifest { revision: string; files: { path: string; sha256: string; imports: { original: string; relocated: string }[] }[] }
const manifest: Manifest = await Bun.file(join(fixtureDir, "manifest.json")).json();
let tree: Tree | undefined;
let repo: TestRepo | undefined;
afterEach(() => { repo?.cleanup(); tree?.cleanup(); repo = undefined; tree = undefined; });

describe("actual 2.51.0 reader compatibility evidence", () => {
  test("historical source matches 22e7ec7 byte-for-byte after reversing import relocation", async () => {
    expect(manifest.revision).toBe("22e7ec7b6aae89c4a13c299e1dff024a26a1d1bc");
    for (const file of manifest.files) {
      let source = await Bun.file(join(fixtureDir, file.path)).text();
      for (const entry of file.imports) source = source.replaceAll(`from "${entry.relocated}"`, `from "${entry.original}"`);
      expect(Bun.CryptoHasher.hash("sha256", source, "hex")).toBe(file.sha256);
    }
  });

  test("additive runtime fields cannot stop an old reader taking over an invisible Codex claim", () => {
    tree = createTree();
    const held = claim({ sessionId: "codex-thread", workspace: "/work/occupied" });
    tree.write("claims/alpha#1.json", JSON.stringify({ ...held, schemaVersion: 2, runtime: "codex", source: "native-daemon" }));
    const loaded = loadClaims(join(tree.root, "claims")).claims[0];
    expect(loaded).toEqual(held);
    if (!loaded) throw new Error("fixture claim missing");
    const context: ClaimContext = { sessions: { ok: true, value: [] }, worktrees: new Set([held.workspace]), baseStates: new Map() };
    expect(claimStatus(loaded, context)).toBe("closed");
    const incoming = claim({ sessionId: "old-claude" });
    expect(takeClaim(join(tree.root, "claims"), incoming, (existing) => isStale(claimStatus(existing, context)))).toMatchObject({ kind: "took-over", from: held });
  });

  test("equal naked IDs from different sources are already-yours and can release the wrong claim", () => {
    tree = createTree();
    const held = claim({ sessionId: "same-native-id" });
    tree.write("claims/alpha#1.json", JSON.stringify({ ...held, runtime: "codex", source: "different-source" }));
    expect(takeClaim(join(tree.root, "claims"), held, () => false)).toEqual({ kind: "already-yours" });
    expect(releaseClaims(join(tree.root, "claims"), "same-native-id", "alpha")).toEqual([held]);
  });

  test("old prune cannot see Codex without a recognized claim; a closed pending claim still protects the tree", async () => {
    repo = repoWithOrigin("legacy-reader-");
    tree = createTree("legacy-claude-");
    mkdirSync(join(tree.root, "sessions"));
    const occupied = repo.addWorktree("occupied", "feat/codex");
    const workspace = realpathSync(occupied.dir);
    const deps = {
      runner: isolatedRunner, asyncRunner: cannedGh(isolatedAsyncRunner, [[["gh", "pr", "list"], { stdout: "[]" }]]),
      claudeHome: tree.root, env: {},
    };
    const withoutClaim = await findPrunable(repo.dir, deps);
    expect(withoutClaim.ok && withoutClaim.value.candidates.map((c) => c.path)).toContain(workspace);
    const file = ".git/spec-board/claims/alpha#1.json";
    repo.write(file, JSON.stringify({ ...claim({ sessionId: "codex-thread", workspace }), runtime: "codex" }));
    const pending = await findPrunable(repo.dir, deps);
    expect(pending.ok && pending.value.candidates).toEqual([]);
    repo.write(file, JSON.stringify({ schemaVersion: 2, ref: { runtime: "codex", id: "codex-thread" }, workspace }));
    const unreadableClaim = await findPrunable(repo.dir, deps);
    expect(unreadableClaim.ok && unreadableClaim.value.candidates.map((c) => c.path)).toContain(workspace);
  });
});
