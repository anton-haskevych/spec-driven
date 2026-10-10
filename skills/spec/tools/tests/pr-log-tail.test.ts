import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { failureTail } from "../pr/failures/log-tail";

const LOG = await Bun.file(join(import.meta.dir, "fixtures", "gh-job-log.txt")).text();

describe("failureTail", () => {
  test("ends at the first ##[error] line, not at the post-job cleanup", () => {
    const tail = failureTail(LOG);
    expect(tail.at(-1)).toBe("##[error]Process completed with exit code 1.");
    expect(tail).toContain("FAILED TESTS:");
    expect(tail.join("\n")).not.toContain("Post job cleanup");
    expect(tail).toHaveLength(30);
  });

  test("strips the BOM, ANSI codes and timestamps", () => {
    const tail = failureTail(LOG, 100);
    expect(tail[0]).toBe("Current runner version: '2.337.0'");
    expect(tail[2]).toBe("pnpm test:backend --all --workers 4");
  });

  test("without an error marker it keeps the last lines", () => {
    expect(failureTail("2026-10-01T00:00:00.1Z a\n2026-10-01T00:00:00.2Z b\n2026-10-01T00:00:00.3Z c\n", 2)).toEqual(["b", "c"]);
  });

  test("an empty log gives no lines", () => {
    expect(failureTail("")).toEqual([]);
  });
});
