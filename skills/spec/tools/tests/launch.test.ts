import { describe, expect, test } from "bun:test";
import { sessionLaunch, type SessionLaunch } from "../launch/command-line";
import { launchArgv, pickTerminal } from "../launch/terminal";

const giftCards: SessionLaunch = {
  title: "gift-cards prep",
  projectDir: "/work/crm",
  command: `claude -n 'gift-cards prep' '/spec-driven:spec prep gift-cards'`,
  shellLine: `cd '/work/crm' && claude -n 'gift-cards prep' '/spec-driven:spec prep gift-cards'`,
};

describe("pickTerminal", () => {
  test("tmux first, then iTerm, then Terminal.app, else none", () => {
    expect(pickTerminal({ TMUX: "/tmp/tmux-501/default,1,0", TERM_PROGRAM: "iTerm.app" })).toBe("tmux");
    expect(pickTerminal({ TERM_PROGRAM: "iTerm.app" })).toBe("iTerm");
    expect(pickTerminal({ TERM_PROGRAM: "Apple_Terminal" })).toBe("Terminal");
    expect(pickTerminal({ TERM_PROGRAM: "vscode" })).toBeUndefined();
    expect(pickTerminal({})).toBeUndefined();
  });
});

describe("launchArgv", () => {
  test("tmux opens a named window in the project directory", () => {
    expect(launchArgv("tmux", giftCards)).toEqual(["tmux", "new-window", "-n", "gift-cards prep", "-c", "/work/crm", giftCards.command]);
  });

  test("iTerm opens a tab (or a window when none is open) and types the line, escaped for AppleScript", () => {
    const [osascript, flag, script] = launchArgv("iTerm", { ...giftCards, shellLine: `cd '/a "b"\\c' && claude` });
    expect([osascript, flag]).toEqual(["osascript", "-e"]);
    expect(script).toContain(`tell current window to create tab with default profile`);
    expect(script).toContain(`create window with default profile`);
    expect(script).toContain(`write text "cd '/a \\"b\\"\\\\c' && claude"`);
  });

  test("Terminal.app runs the line in a new window", () => {
    expect(launchArgv("Terminal", giftCards)).toEqual([
      "osascript",
      "-e",
      `tell application "Terminal" to do script "${giftCards.shellLine}"`,
      "-e",
      `tell application "Terminal" to activate`,
    ]);
  });
});

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
