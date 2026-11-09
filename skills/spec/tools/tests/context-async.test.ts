import { afterAll, expect, test } from "bun:test";
import { contextPack, type ContextDeps } from "../commands/context";
import { createTree } from "./tree";
import { stubRunner } from "./stub-runner";

const tree = createTree("context-async-");
afterAll(() => tree.cleanup());

test("context awaits one held snapshot for both phase picking and related-spec attribution", async () => {
  tree.write("docs/specs/one/CLAUDE.md", "---\nstatus: active\nrelated:\n  - two: shared work\n---\n");
  tree.write("docs/specs/one/progress.md", "- [ ] Phase 1 — First → `phases/phase-1.md`\n- [ ] Phase 2 — Second → `phases/phase-2.md`\n");
  for (const id of ["1", "2"]) tree.write(`docs/specs/one/phases/phase-${id}.md`, "---\nneeds: []\n---\n- [ ] work\n");
  tree.write("docs/specs/one/ledger/INDEX.md", "# Ledger\n");
  tree.write("docs/specs/two/CLAUDE.md", "---\nstatus: active\n---\n");
  let calls = 0;
  let release: (held: ReadonlyMap<string, string>) => void = () => { throw new Error("reader not started"); };
  const deps: ContextDeps = {
    runner: stubRunner([]), readClaimsHere: () => [],
    readHeld: () => { calls++; return new Promise((resolve) => { release = resolve; }); },
  };
  let finished = false;
  const pending = contextPack(tree.root, { mode: "execute", name: "one" }, deps).then((pack) => { finished = true; return pack; });
  expect(calls).toBe(1);
  expect(finished).toBe(false);
  release(new Map([["one#1", "first worker"], ["two#1", "related worker"]]));
  const pack = await pending;
  expect(pack).toContain("Picked: Phase 2");
  expect(pack).toContain("skipped 1 (in flight: first worker)");
  expect(pack).toContain("related worker");
  expect(calls).toBe(1);
});
