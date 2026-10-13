import { afterAll, describe, expect, test } from "bun:test";
import { loadNodes } from "../graph/nodes";
import { loadSpecState, specStateFrom } from "../core/spec-state";
import { createTree } from "./tree";

const tree = createTree("spec-title-review-");
const reviewed = tree.spec("reviewed", { "CLAUDE.md": "---\nstatus: active\n---\n\n# Reviewed Spec\n\nBody.\n", "reviews/2026-10-10-panel.md": "# panel\n" });
const fresh = tree.spec("fresh", { "CLAUDE.md": "---\nstatus: draft\n---\n# Fresh  \n" });
tree.spec("untitled", {});

afterAll(() => tree.cleanup());

describe("spec title", () => {
  test("is the first H1 of CLAUDE.md after the frontmatter, trimmed", () => {
    const nodes = loadNodes(tree.root);
    expect(nodes.get("reviewed")?.title).toBe("Reviewed Spec");
    expect(nodes.get("fresh")?.title).toBe("Fresh");
  });

  test("is absent when CLAUDE.md has no H1", () => {
    expect(loadNodes(tree.root).get("untitled")?.title).toBeUndefined();
  });
});

describe("reviewed", () => {
  test("a state loaded from disk says whether the spec has a reviews/ folder", () => {
    expect(loadSpecState(reviewed).reviewed).toBe(true);
    expect(loadSpecState(fresh).reviewed).toBe(false);
  });

  test("a state built from a file reader leaves it unknown", () => {
    expect(specStateFrom(fresh, () => undefined).reviewed).toBeUndefined();
  });
});
