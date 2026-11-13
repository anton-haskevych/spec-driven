import { describe, expect, test } from "bun:test";
import { bannerLine, progressStub } from "../plan/banner";
import { planTidy, tidyPhaseText } from "../plan/tidy";
import { ON_BOARD } from "../phases/template";

const PHASE = "---\nneeds: [1]\nsame-files-as: [3]\npr: B\ncode: false\ngate: design\n---\n# Phase 2\n\nGoal.\n\n## Deliverables\n\n- [x] one — abc\n- [ ] two\n";

describe("tidyPhaseText", () => {
  test("drops the edges and the boxes; other frontmatter and prose stay", () => {
    expect(tidyPhaseText(PHASE)).toBe(`---\ncode: false\ngate: design\n---\n# Phase 2\n\nGoal.\n\n## Deliverables\n\n${ON_BOARD}\n`);
  });

  test("a tidied file, and a file with no boxes or edges, are left as they are", () => {
    expect(tidyPhaseText(tidyPhaseText(PHASE))).toBe(tidyPhaseText(PHASE));
    expect(tidyPhaseText("# Phase 3\n\nNo tasks.\n")).toBe("# Phase 3\n\nNo tasks.\n");
  });
});

describe("planTidy", () => {
  const progress = `# Alpha\n\n${bannerLine("2026-11-11")}\n\n## Phases\n- [ ] Phase 2 — Two → \`phases/phase-2.md\`\n`;

  test("lists only the files that change: the stub and each phase file with boxes or edges", () => {
    const planned = planTidy("alpha", "2026-11-12", { progress, phases: [{ pointer: "phases/phase-2.md", text: PHASE }, { pointer: "phases/phase-3.md", text: "# Phase 3\n" }] });
    expect(planned).toEqual([
      { pointer: "progress.md", text: progressStub(progress, "alpha", "2026-11-12") },
      { pointer: "phases/phase-2.md", text: tidyPhaseText(PHASE) },
    ]);
  });

  test("a tidied spec plans nothing", () => {
    const tidied = { progress: progressStub(progress, "alpha", "2026-11-12"), phases: [{ pointer: "phases/phase-2.md", text: tidyPhaseText(PHASE) }] };
    expect(planTidy("alpha", "2026-11-12", tidied)).toEqual([]);
  });
});
