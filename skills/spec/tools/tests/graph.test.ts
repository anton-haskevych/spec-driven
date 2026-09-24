import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { graphCommand } from "../commands/graph";
import { graphIssues } from "../graph/checks";
import { blockers, neighborhood } from "../graph/neighborhood";
import { loadNodes } from "../graph/nodes";
import { parseRelations, phasesInRef } from "../graph/relations";
import { hookResponse } from "../hooks/spec-file-check";

let project = "";

function spec(name: string, frontmatter: string, phases: string, codeMap = ""): void {
  const dir = join(project, "docs", "specs", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "CLAUDE.md"), `---\nstatus: active\n${frontmatter}---\n`);
  writeFileSync(join(dir, "progress.md"), phases);
  writeFileSync(join(dir, "code-map.md"), `| File | Why |\n|---|---|\n${codeMap}`);
}

const twoPhases = (firstDone: boolean) =>
  `- [${firstDone ? "x" : " "}] Phase 1 — One → \`phases/p1.md\`\n- [ ] Phase 2 — Two → \`phases/p2.md\`\n`;

beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "spec-graph-"));
  spec("accounts", "", twoPhases(true));
  spec("front-doors", "part-of: accounts\n", twoPhases(false), "| `src/claim.ts` | x |\n");
  spec("organizer", "needs: [safety#1-2]\nsupersedes: [front-doors#2]\nrelated:\n  - accounts: owns identity\n", twoPhases(false), "| `src/brand.tsx` | x |\n");
  spec("safety", "", twoPhases(true));
  spec("profile", "", twoPhases(false), "| `src/brand.tsx` | x |\n");
  spec("broken", "needs: [ghost, safety#9]\npart-of: loop\n", twoPhases(false));
  spec("loop", "part-of: broken\n", twoPhases(false));
});

afterAll(() => rmSync(project, { recursive: true, force: true }));

describe("parseRelations", () => {
  test("reads scalar, list and note-map forms", () => {
    const relations = parseRelations({ "part-of": "a", needs: "b#2", related: [{ c: "owns x" }, "d"] });
    expect(relations).toEqual([
      { type: "part-of", target: "a" },
      { type: "needs", target: "b", phases: "2" },
      { type: "related", target: "c", note: "owns x" },
      { type: "related", target: "d" },
    ]);
  });

  test("resolves exact ids before numeric ranges", () => {
    expect(phasesInRef("2b-pre", ["1", "2b-pre", "3"])).toEqual(["2b-pre"]);
    expect(phasesInRef("4-5", ["3", "4", "4a", "5", "6"])).toEqual(["4", "4a", "5"]);
  });
});

describe("neighborhood", () => {
  test("computes reverse links and marks open needs as blockers", () => {
    const nodes = loadNodes(project);
    const types = neighborhood(nodes, "front-doors").map((link) => `${link.type}:${link.other}`);
    expect(types).toEqual(["part-of:accounts", "superseded-by:organizer"]);
    expect(neighborhood(nodes, "accounts").map((link) => `${link.type}:${link.other}`)).toEqual([
      "child:front-doors",
      "related:organizer",
    ]);
    expect(blockers(neighborhood(nodes, "organizer")).map((link) => link.other)).toEqual(["safety"]);
  });
});

describe("graphIssues", () => {
  test("flags missing specs, missing phases and part-of cycles", () => {
    const problems = graphIssues(loadNodes(project), "broken", "CLAUDE.md").map((issue) => issue.problem);
    expect(problems).toContain("needs ghost: no spec named ghost");
    expect(problems).toContain("needs safety#9: safety has no phase 9 (phases: 1, 2)");
    expect(problems).toContain("needs/part-of cycle: broken → loop → broken");
  });

  test("flags superseded phases that are still open and undeclared file overlaps", () => {
    const nodes = loadNodes(project);
    expect(graphIssues(nodes, "front-doors", "CLAUDE.md").map((i) => i.problem)).toContain(
      "phases 2 are superseded by organizer but still open; tick them with a note or drop them",
    );
    expect(graphIssues(nodes, "organizer", "CLAUDE.md").map((i) => i.problem)).toContain(
      "shares src/brand.tsx with active spec profile but declares no relation",
    );
  });
});

describe("graphCommand", () => {
  test("prints the neighborhood with blockers, and which specs touch given files", () => {
    const report = graphCommand(project, ["organizer"]);
    expect(report).toContain("- needs: safety#1-2  NOT DONE (blocks)");
    expect(report).toContain("Blocked by: safety#1-2");
    expect(graphCommand(project, ["files", "src/brand.tsx"])).toContain("- organizer (open): src/brand.tsx");
  });
});

describe("spec-file hook", () => {
  test("blocks a CLAUDE.md whose relation points at a spec that does not exist", () => {
    const file = join(project, "docs", "specs", "broken", "CLAUDE.md");
    const response = hookResponse({ tool_name: "Write", tool_input: { file_path: file }, cwd: project }, project);
    expect(response).toContain("no spec named ghost");
  });
});
