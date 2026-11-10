import { describe, expect, test } from "bun:test";
import { inFlightBlock } from "../context/in-flight";

const SPEC_DIR = "/project with spaces/docs/specs/checkout";

describe("inFlightBlock", () => {
  test("a note over the old 2000-character cut is shown whole, pickup instructions included", () => {
    const text = `${"Existing work.\n".repeat(250)}\n## Pick up from here\nVerify the migration before editing.`;
    const block = inFlightBlock(SPEC_DIR, [{ file: "in-flight/phase-2.md", text }]);
    expect(block).toBe(`### In-flight (raw)\n#### in-flight/phase-2.md\n${text}`);
  });

  test("a note that doesn't fit is named by path to read in full, never clipped; the ones that fit stay whole", () => {
    const block = inFlightBlock(SPEC_DIR, [
      { file: "in-flight/phase-2.md", text: `${"Existing work.\n".repeat(700)}\n## Pick up from here\nVerify the migration.` },
      { file: "in-flight/pr-A.md", text: "Hold the PR until that verification passes." },
    ]);
    expect(block).toBe(
      [
        "### In-flight (raw)\n#### in-flight/pr-A.md\nHold the PR until that verification passes.",
        `Too large to show here. Read each in full before acting:\n- ${SPEC_DIR}/in-flight/phase-2.md`,
      ].join("\n\n"),
    );
  });

  test("other phases' notes are paths only, marked as not this chunk's", () => {
    const block = inFlightBlock(SPEC_DIR, [], [{ file: "in-flight/phase-1.md", text: "deploy pending" }]);
    expect(block).toBe(
      `### In-flight (raw)\n(none)\n\nOther phases' pending notes, not this chunk's. Read one only when the work touches that phase:\n- ${SPEC_DIR}/in-flight/phase-1.md`,
    );
  });

  test("missing and blank notes print (none) and no paths", () => {
    expect(inFlightBlock(SPEC_DIR, [])).toBe("### In-flight (raw)\n(none)");
    expect(inFlightBlock(SPEC_DIR, [{ file: "in-flight.md", text: " \n" }], [{ file: "in-flight/phase-1.md", text: "" }])).toBe("### In-flight (raw)\n(none)");
  });
});
