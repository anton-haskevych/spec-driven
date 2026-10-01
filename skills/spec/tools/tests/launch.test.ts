import { describe, expect, test } from "bun:test";
import { sessionLaunch } from "../launch/command-line";

describe("sessionLaunch", () => {
  test("names the session and builds the line that starts Claude on the spec sub-command", () => {
    expect(sessionLaunch("/work/crm", ["prep", "gift-cards"])).toEqual({
      ok: true,
      value: {
        title: "gift-cards prep",
        projectDir: "/work/crm",
        command: "claude -n 'gift-cards prep' '/spec-driven:spec prep gift-cards'",
        shellLine: "cd '/work/crm' && claude -n 'gift-cards prep' '/spec-driven:spec prep gift-cards'",
      },
    });
  });

  test("quotes a project path that holds spaces or single quotes", () => {
    const launch = sessionLaunch("/Users/a/My Work/it's", ["resume", "billing"]);
    expect(launch.ok && launch.value.shellLine).toStartWith(`cd '/Users/a/My Work/it'\\''s' && `);
  });

  test("refuses an unknown sub-command or a spec name that isn't kebab-case", () => {
    expect(sessionLaunch("/w", ["deploy", "billing"])).toEqual({ ok: false, reason: "unknown sub-command deploy (prep, create, resume, execute, review, update, handoff, status, list, idea)" });
    expect(sessionLaunch("/w", ["prep", "Gift Cards"])).toEqual({ ok: false, reason: "spec name must be kebab-case: Gift Cards" });
    expect(sessionLaunch("/w", ["prep"])).toEqual({ ok: false, reason: "usage: launch <sub-command> <spec-name>" });
  });
});
