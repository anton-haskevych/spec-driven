import { describe, expect, test } from "bun:test";
import { fastTierArgs, tripwireReport } from "./tripwire";

describe("tripwireReport", () => {
  test("a run that reached no git reports nothing", () => {
    expect(tripwireReport("")).toBeUndefined();
  });

  test("names each git call once, with how often it ran, and what to do", () => {
    const log = "git remote get-url origin (in /tmp/a)\ngit remote get-url origin (in /tmp/a)\ngit check-attr merge (in /tmp/b)\n";
    expect(tripwireReport(log)).toBe(
      [
        "real git in the fast tier (3 calls):",
        "  2× git remote get-url origin (in /tmp/a)",
        "  1× git check-attr merge (in /tmp/b)",
        "A seam is missing or a default runner leaked: pass the deps (tests/stub-runner.ts notARepoRunner, tests/command-deps.ts), or rename the file *.git.test.ts.",
      ].join("\n"),
    );
  });
});

test("fastTierArgs leaves out real-git files and fixtures and passes the caller's filters on", () => {
  expect(fastTierArgs(["claims"])).toEqual(["test", "--path-ignore-patterns=**/*.git.test.ts", "--path-ignore-patterns=**/fixtures/**", "claims"]);
});
