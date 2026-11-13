import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { phaseCommand } from "../commands/phase";
import { noteEdit } from "../plan/ops/phase-state";
import { phaseDoc } from "./record-factories";
import { createTree, type Tree } from "./tree";
import { phaseDeps } from "./command-deps";


describe("noteEdit", () => {
  const edit = (phase = phaseDoc(), note?: string) => noteEdit({ spec: "checkout", phase: "1", ...(note === undefined ? {} : { note }), at: "T1", by: "s1" })(phase);

  test("writes the note without its questions, and says how long it is", () => {
    expect(edit(undefined, "# In-flight\n\nPick up here.\n\n## Needs you\n- Parked T0: x?\n")).toMatchObject({
      phase: { handoff: { at: "T1", by: "s1", note: "# In-flight\n\nPick up here.\n" } },
      line: "note: phase 1 · hand-off note on the board (3 lines)",
    });
  });

  test("the same note again, or clearing none, changes nothing; clearing removes it", () => {
    const noted = phaseDoc({ handoff: { at: "T0", by: "s0", note: "same\n" } });
    expect(edit(noted, "same\n")).toEqual({ unchanged: "note: phase 1 · the board already has this note" });
    expect(edit()).toEqual({ unchanged: "note: phase 1 has no hand-off note" });
    const cleared = edit(noted);
    expect("phase" in cleared && cleared.phase.handoff).toBeUndefined();
  });
});

describe("phase note on a spec in files", () => {
  let tree: Tree | undefined;
  afterEach(() => tree?.cleanup());

  function spec(): Tree {
    tree = createTree("spec-note-");
    tree.spec("demo", {
      "progress.md": "## Phases\n- [ ] Phase 1 — One → `phases/phase-1-one.md`\n",
      "ledger/INDEX.md": "# Ledger\n",
      "phases/phase-1-one.md": "# Phase 1 — One\n\n- [ ] a\n",
      "in-flight/phase-1.md": "# old\n\nold\n\n## Needs you\n- Parked T0: Ship?\n",
    });
    tree.write("note.md", "# In-flight — phase 1\n\nPick up here.\n");
    return tree;
  }

  test("overwrites the phase's in-flight file and keeps its questions; clearing keeps only them", async () => {
    const dir = spec().root;
    const file = join(dir, "docs/specs/demo/in-flight/phase-1.md");
    expect(await phaseCommand(dir, ["note", "demo", "1", "--file", join(dir, "note.md")], undefined, phaseDeps())).toBe("note: phase 1 · in-flight/phase-1.md written; commit it with the hand-off");
    expect(readFileSync(file, "utf8")).toBe("# In-flight — phase 1\n\nPick up here.\n\n## Needs you\n- Parked T0: Ship?\n");
    expect(await phaseCommand(dir, ["note", "demo", "1", "--clear"], undefined, phaseDeps())).toBe("note: phase 1 · in-flight/phase-1.md written; commit it with the hand-off");
    expect(readFileSync(file, "utf8")).toBe("# In-flight — phase 1\n\n## Needs you\n- Parked T0: Ship?\n");
  });

  test("a note with nothing pending is removed by --clear; bad usage is named", async () => {
    const dir = spec().root;
    const file = join(dir, "docs/specs/demo/in-flight/phase-1.md");
    Bun.write(file, "# old\n\nold\n");
    expect(await phaseCommand(dir, ["note", "demo", "1", "--clear"], undefined, phaseDeps())).toBe("note: phase 1 · in-flight/phase-1.md removed");
    expect(existsSync(file)).toBe(false);
    expect(await phaseCommand(dir, ["note", "demo", "1"], undefined, phaseDeps())).toBe("usage: phase note <spec> <phase> --file <note.md> | --clear");
  });
});
