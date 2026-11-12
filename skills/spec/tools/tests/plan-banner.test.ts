import { describe, expect, test } from "bun:test";
import { bannerLine, manualReadLine, planBanner, progressStub, withoutBoardLines } from "../plan/banner";

describe("planBanner", () => {
  test("goes right under the title", () => {
    expect(planBanner("# Spec — Progress\n\n## Phases\n- [ ] Phase 1\n", "2026-11-11")).toEqual({
      kind: "write",
      text: `# Spec — Progress\n\n${bannerLine("2026-11-11")}\n\n## Phases\n- [ ] Phase 1\n`,
    });
    expect(bannerLine("2026-11-11")).toBe("> On the board since 2026-11-11. This list is frozen; the board is the source.");
  });

  test("goes at the top when there is no title, and is never added twice", () => {
    const planned = planBanner("## Phases\n", "2026-11-11");
    expect(planned).toEqual({ kind: "write", text: `${bannerLine("2026-11-11")}\n\n## Phases\n` });
    expect(planBanner(planned.kind === "write" ? planned.text : "", "2026-12-01")).toEqual({ kind: "unchanged" });
  });
});

describe("progressStub", () => {
  const read = manualReadLine("alpha");

  test("keeps the title and the banner's day, and names the manual read", () => {
    const progress = `# Alpha — Progress\n\n${bannerLine("2026-11-11")}\n\n## Phases\n- [ ] Phase 1 — One → \`phases/phase-1.md\`\n`;
    expect(progressStub(progress, "alpha", "2026-12-01")).toBe(`# Alpha — Progress\n\n${bannerLine("2026-11-11")}\n${read}\n`);
    expect(read).toBe("> Read it by hand: `git fetch origin refs/spec-board/record`, then `git show FETCH_HEAD:specs/alpha/phases/<id>.json`.");
  });

  test("a file with no title or banner gets both", () => {
    expect(progressStub("", "alpha", "2026-12-01")).toBe(`# alpha — Progress\n\n${bannerLine("2026-12-01")}\n${read}\n`);
  });

  test("withoutBoardLines takes the banner and the read line back out", () => {
    const stub = progressStub("# Alpha\n", "alpha", "2026-12-01");
    expect(withoutBoardLines(`${stub}\n## Phases\n`)).toBe("# Alpha\n\n## Phases\n");
  });
});
