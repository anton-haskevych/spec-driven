import { describe, expect, test } from "bun:test";
import { inFlightBlock } from "../context/in-flight";

describe("handoff context", () => {
  test("small handoffs are complete, including pickup instructions at the end", () => {
    const text = "## Where things stand\nReady.\n\n## Pick up from here\nVerify the migration before editing.";
    const pack = inFlightBlock([{ file: "in-flight/phase-2.md", text }], "/project/docs/specs/checkout");
    expect(pack).toContain(text);
    expect(pack).not.toContain("read now");
  });

  test("large handoffs require full source reads instead of clipping their pickup instructions", () => {
    const notes = [
      { file: "in-flight/phase-2.md", text: "Existing work.\n".repeat(250) + "\n## Pick up from here\nVerify the migration." },
      { file: "in-flight/pr-A.md", text: "Hold the PR until that verification passes." },
    ];
    const pack = inFlightBlock(notes, "/project with spaces/docs/specs/checkout");
    expect(pack).toContain("### In-flight (read now)");
    expect(pack).toContain("/project with spaces/docs/specs/checkout/in-flight/phase-2.md");
    expect(pack).toContain("/project with spaces/docs/specs/checkout/in-flight/pr-A.md");
    expect(pack).not.toContain("Existing work.");
    expect(pack).not.toContain("clipped");
    expect(pack.length).toBeLessThan(2000);
  });

  test("missing or empty clean-boundary notes need no source read", () => {
    expect(inFlightBlock([], "/spec")).toContain("(none)");
    expect(inFlightBlock([{ file: "in-flight.md", text: " \n" }], "/spec")).toContain("(none)");
  });
});
