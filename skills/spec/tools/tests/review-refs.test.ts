import { afterEach, describe, expect, test } from "bun:test";
import { phaseCommand } from "../commands/phase";
import { loadSpecState } from "../core/spec-state";
import { loadNodes } from "../graph/nodes";
import { refsToPhase } from "../phases/review-refs";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

function project() {
  tree = createTree("spec-review-");
  const checkout = tree.spec("checkout", {
    "progress.md": [
      "- [ ] Phase 7 — Sync → `phases/p7.md`",
      "- [ ] Phase 8 — Report → `phases/p8.md`",
      "- [ ] Phase 9 — Ship → `phases/p9.md`",
      "",
    ].join("\n"),
    "phases/p7.md": "---\nneeds: []\n---\n- [ ] a\n",
    "phases/p8.md": "---\nneeds: [7]\nsame-files-as: [7]\n---\n- [ ] b\n",
    "phases/p9.md": "---\nneeds: [8]\n---\n- [ ] c\n",
  });
  tree.spec("billing", {
    "CLAUDE.md": "---\nstatus: active\nneeds: [checkout#6-8]\nrelated:\n  - checkout#9: unrelated\n---\n",
    "progress.md": "- [ ] Phase 1 — Pay → `phases/p1.md`\n",
    "phases/p1.md": "---\nneeds: [checkout#7]\n---\n- [ ] d\n",
  });
  return checkout;
}

describe("refsToPhase", () => {
  test("lists sibling edges, other specs' relations and other specs' phase edges that point at the phase", () => {
    const spec = project();
    expect(refsToPhase(loadSpecState(spec), "7", loadNodes(tree.root))).toEqual([
      "Phase 8 needs 7",
      "Phase 8 same-files-as 7",
      "billing CLAUDE.md needs checkout#6-8",
      "billing Phase 1 needs checkout#7",
    ]);
  });

  test("split prints them for review after the summary", () => {
    project();
    const output = phaseCommand(tree.root, ["split", "checkout", "7", "Extra"]);
    expect(output).toContain(
      "\nThese still point at Phase 7; keep them, or retarget to a new part:\n- Phase 8 needs 7\n",
    );
  });
});
