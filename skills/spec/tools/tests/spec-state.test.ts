import { describe, expect, test } from "bun:test";
import { specStateFrom } from "../core/spec-state";

describe("specStateFrom", () => {
  test("builds the state from any reader, so writers can validate planned text without disk", () => {
    const files: Record<string, string> = {
      "progress.md": "- [x] Phase 1 — One → `phases/p1.md`\n- [ ] Phase 2 — Two → `phases/p2.md`\n",
      "phases/p1.md": "- [x] a\n",
      "phases/p2.md": "---\ncode: false\n---\n- [ ] b\n",
    };
    const state = specStateFrom({ name: "memory", dir: "/nowhere" }, (path) => files[path]);
    expect(state.hasProgress).toBe(true);
    expect(state.phases.map((phase) => [phase.id, phase.done, phase.code])).toEqual([
      ["1", true, true],
      ["2", false, false],
    ]);
    expect(state.inFlight).toBeUndefined();
  });
});
