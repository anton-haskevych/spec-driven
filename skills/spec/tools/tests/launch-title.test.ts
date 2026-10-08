import { describe, expect, test } from "bun:test";
import { sessionLaunch } from "../launch/command-line";
import { launchTitle, parseLaunchTitle, type LaunchTitle } from "../launch/title";

describe("launchTitle", () => {
  test("names the session <spec> <sub-command> [<phase>], phase without its word", () => {
    expect(launchTitle("gift-cards", "prep")).toBe("gift-cards prep");
    expect(launchTitle("spec-board", "execute", "phase-6")).toBe("spec-board execute 6");
  });
});

describe("parseLaunchTitle", () => {
  test("reads back what launch names a session", () => {
    const cases: [string[], LaunchTitle][] = [
      [["prep", "gift-cards"], { spec: "gift-cards", sub: "prep" }],
      [["execute", "spec-board", "9.10"], { spec: "spec-board", sub: "execute", phase: "9.10" }],
      [["execute", "spec-board", "phase7ab"], { spec: "spec-board", sub: "execute", phase: "7ab" }],
    ];
    for (const [args, expected] of cases) {
      const launch = sessionLaunch("/repo", args);
      expect(launch.ok && parseLaunchTitle(launch.value.title)).toEqual(expected);
    }
  });

  test("anything else is not a launch title", () => {
    for (const name of ["crm-d1", "gift-cards", "gift-cards ship", "Gift-Cards prep", "gift-cards execute next", "gift-cards execute 2 now", "gift-cards  prep"]) {
      expect(parseLaunchTitle(name)).toBeUndefined();
    }
  });
});
