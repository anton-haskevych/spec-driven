import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, existsSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inspectCandidate } from "../runtime/codex/candidate";
import { createTree, type Tree } from "./tree";

const source = join(import.meta.dir, "../../../..");
const sourceVersion = JSON.parse(readFileSync(join(source, ".codex-plugin/plugin.json"), "utf8")).version;
let tree: Tree;
beforeEach(() => {
  tree = createTree("candidate-");
  for (const path of ["skills", "agents", "scripts", ".codex-plugin", ".claude-plugin"]) cpSync(join(source, path), join(tree.root, path), { recursive: true });
});
afterEach(() => tree?.cleanup());

test("copied source identifies actual bytes without Git or installed runtime dependencies", () => {
  expect(existsSync(join(tree.root, ".git"))).toBe(false);
  expect(existsSync(join(tree.root, "node_modules"))).toBe(false);
  const result = inspectCandidate(tree.root);
  expect(result).toMatchObject({ ok: true, value: { root: realpathSync(tree.root), version: sourceVersion, revision: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) } });
  const native = JSON.parse(readFileSync(join(tree.root, ".codex-plugin/plugin.json"), "utf8"));
  expect(native.skills).toBe("./skills/");
  const versions = Bun.spawnSync(["python3", join(tree.root, "scripts/version.py")]);
  expect(versions.exitCode).toBe(0);
  expect(versions.stdout.toString()).toContain(`All version declarations match: ${sourceVersion}`);
});

test("same catalog version cannot hide changed candidate code or canonical workflow", () => {
  const before = inspectCandidate(tree.root);
  if (!before.ok) throw new Error(before.reason);
  for (const path of ["skills/spec/tools/spec.ts", "skills/spec/execute.md", "skills/spec/installed-local-cycle.md", "agents/principal-engineer.md", "skills/spec/scripts/spec-bump.sh"]) {
    const original = readFileSync(join(tree.root, path), "utf8");
    writeFileSync(join(tree.root, path), `${original}\nchanged\n`);
    const after = inspectCandidate(tree.root);
    if (!after.ok) throw new Error(after.reason);
    expect(after.value.version).toBe(before.value.version);
    expect(after.value.revision).not.toBe(before.value.revision);
    writeFileSync(join(tree.root, path), original);
  }
});

test("missing assets refuse and packaging metadata stays in the existing version gate", () => {
  rmSync(join(tree.root, "skills/spec/taxonomy.md"));
  expect(inspectCandidate(tree.root)).toMatchObject({ ok: false, reason: expect.stringContaining("missing or unreadable") });
  expect(inspectCandidate("/missing").ok).toBe(false);
  const manifestPath = join(tree.root, ".codex-plugin/plugin.json");
  const native = JSON.parse(readFileSync(manifestPath, "utf8"));
  writeFileSync(manifestPath, JSON.stringify({ ...native, version: "different" }));
  expect(Bun.spawnSync(["python3", join(tree.root, "scripts/version.py")]).exitCode).not.toBe(0);
});

test("candidate rejects invalid manifests and skill roots instead of guessing another package", () => {
  const path = join(tree.root, ".codex-plugin/plugin.json");
  const original = JSON.parse(readFileSync(path, "utf8"));
  for (const patch of [{ skills: "../outside" }, { name: "different" }, { version: "" }]) {
    writeFileSync(path, JSON.stringify({ ...original, ...patch }));
    expect(inspectCandidate(tree.root).ok).toBe(false);
  }
});
