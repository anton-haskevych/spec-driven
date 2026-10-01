import { describe, expect, test } from "bun:test";
import { error, newIssues, warning } from "../doctor/issue";

describe("newIssues", () => {
  test("keeps only issues absent before, matching on severity, file and problem", () => {
    const before = [warning("a.md", "has no row for x.md"), error("b.md", "broken")];
    const after = [warning("a.md", "has no row for x.md"), error("a.md", "has no row for x.md"), warning("c.md", "new")];
    expect(newIssues(before, after)).toEqual([error("a.md", "has no row for x.md"), warning("c.md", "new")]);
  });
});
