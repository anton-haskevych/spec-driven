import { describe, expect, test } from "bun:test";
import { bannerLine, planBanner } from "../plan/banner";

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
