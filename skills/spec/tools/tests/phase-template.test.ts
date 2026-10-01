import { describe, expect, test } from "bun:test";
import { familyOf, nextIntegerId, nextLetterIds } from "../phases/ids";
import { phaseFileText, phasePointer, progressLine, slugify } from "../phases/template";
import { parseFrontmatter } from "../core/frontmatter";
import { parsePhaseEdges } from "../core/phase-edges";
import { summarizePhaseEntry } from "../core/phase-entry";

describe("phase ids", () => {
  test("nextIntegerId is one past the largest leading integer", () => {
    expect(nextIntegerId(["1", "2b-pre", "9.10", "intro"])).toBe("10");
    expect(nextIntegerId([])).toBe("1");
  });

  test("nextLetterIds skips letters already taken, case-insensitively", () => {
    expect(nextLetterIds("7", ["7", "7A", "8"], 2)).toEqual(["7b", "7c"]);
    expect(nextLetterIds("7a", ["7a"], 1)).toEqual(["7aa"]);
  });

  test("familyOf keeps the id and its letter children, never 70 or 7.1", () => {
    expect(familyOf("7", ["6", "7", "7a", "7b-pre", "70", "7.1", "8"])).toEqual(["7", "7a", "7b-pre"]);
  });
});

describe("phase template", () => {
  test("slugify lower-cases and dashes a title", () => {
    expect(slugify("Hooks: Bash write guard & context nudge!")).toBe("hooks-bash-write-guard-context-nudge");
  });

  test("pointer and progress line follow the repo's shape", () => {
    expect(phasePointer("7A", "Tick and deployed")).toBe("phases/phase-7a-tick-and-deployed.md");
    expect(progressLine("7a", "Tick", "phases/phase-7a-tick.md")).toBe("- [ ] Phase 7a — Tick → `phases/phase-7a-tick.md`");
  });

  test("the file carries edges, Goal, Outcome and deliverables, and parses back", () => {
    const text = phaseFileText({ id: "4", title: "Lessons add", edges: { needs: ["2", "3"], pr: "B", code: false } });
    const parsed = parseFrontmatter(text);
    const data = parsed.kind === "ok" ? parsed.data : undefined;
    expect(parsePhaseEdges(data)).toMatchObject({ needs: ["2", "3"], pr: "B" });
    expect(data?.code).toBe(false);
    expect(text).toContain("# Phase 4 — Lessons add\n\n**Goal:**");
    expect(text).toContain("\n**Outcome:** <plain words: what changes for the user · cost · risk>\n");
    expect(summarizePhaseEntry(parsed.kind === "ok" ? parsed.body : "").deliverables).toEqual({ checked: 0, unchecked: 1 });
  });

  test("needs defaults to [] and given items replace the placeholder deliverable", () => {
    const text = phaseFileText({ id: "5", title: "X", edges: {}, items: ["- [ ] moved one", "- [ ] moved two"] });
    expect(text).toStartWith("---\nneeds: []\n---\n");
    expect(text).toContain("## Deliverables\n\n- [ ] moved one\n- [ ] moved two\n");
  });
});
