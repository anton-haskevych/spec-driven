import { describe, expect, test } from "bun:test";
import { sessionLaunch, type SessionLaunch } from "../launch/command-line";
import { launchArgv, pickTerminal } from "../launch/terminal";
import { launchReport } from "../commands/launch";
import { stubRunner } from "./stub-runner";

describe("launchReport", () => {
  const iTerm = { TERM_PROGRAM: "iTerm.app" };

  test("opens the session and says where", () => {
    const runner = stubRunner([[["osascript"], {}]]);
    expect(launchReport("/work/crm", ["prep", "gift-cards"], iTerm, runner)).toBe("Launched: iTerm — gift-cards prep");
    expect(runner.calls).toHaveLength(1);
  });

  test("without a terminal it can drive, it prints the line to run", () => {
    const runner = stubRunner([]);
    expect(launchReport("/work/crm", ["prep", "gift-cards"], {}, runner)).toBe(`launch: run this in a new terminal: ${giftCards.shellLine}`);
    expect(runner.calls).toEqual([]);
  });

  test("a refused launch still hands over the line, with the reason", () => {
    const runner = stubRunner([[["osascript"], { code: 1, stderr: "execution error: Not authorized to send Apple events to iTerm. (-1743)\n" }]]);
    expect(launchReport("/work/crm", ["prep", "gift-cards"], iTerm, runner)).toBe(
      `launch: run this in a new terminal: ${giftCards.shellLine} (iTerm: execution error: Not authorized to send Apple events to iTerm. (-1743))`,
    );
  });

  test("bad arguments come back as one launch line", () => {
    expect(launchReport("/w", ["prep"], iTerm, stubRunner([]))).toBe("launch: usage: launch <sub-command> <spec-name>");
  });
});

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
