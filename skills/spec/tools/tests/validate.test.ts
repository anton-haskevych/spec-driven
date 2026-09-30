import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { issuesIntroducedBy } from "../phases/validate";
import { createTree, type Tree } from "./tree";

let tree: Tree;
afterEach(() => tree.cleanup());

describe("issuesIntroducedBy", () => {
  test("reports only issues the planned edits add, not drift already on disk", () => {
    tree = createTree("spec-validate-");
    const spec = tree.spec("checkout", {
      "progress.md": "- [x] Phase 1 — One → `phases/p1.md`\n- [ ] Phase 2 — Two → `phases/p2.md`\n",
      "phases/p1.md": "- [ ] still open\n",
      "phases/p2.md": "- [ ] last item\n",
    });
    const unflipped = [{ file: join(spec.dir, "phases/p2.md"), text: "- [x] last item\n" }];
    const problems = issuesIntroducedBy(spec, unflipped).map((issue) => issue.problem);
    expect(problems).toEqual(['"Phase 2 — Two" has every sub-item ticked in phases/p2.md; tick the phase']);
  });

  test("a plan that fixes drift introduces nothing", () => {
    tree = createTree("spec-validate-");
    const spec = tree.spec("checkout", {
      "progress.md": "- [x] Phase 1 — One → `phases/p1.md`\n",
      "phases/p1.md": "- [ ] still open\n",
    });
    expect(issuesIntroducedBy(spec, [{ file: join(spec.dir, "phases/p1.md"), text: "- [x] still open\n" }])).toEqual([]);
  });
});
