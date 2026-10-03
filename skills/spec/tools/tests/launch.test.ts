import { describe, expect, test } from "bun:test";
import { sessionLaunch, type SessionLaunch } from "../launch/command-line";
import { launchArgv, pickTerminal } from "../launch/terminal";
import { launchCommand, launchReport } from "../commands/launch";
import type { Placement } from "../trees/place";
import { stubRunner } from "./stub-runner";

describe("launchReport", () => {
  const iTerm = { TERM_PROGRAM: "iTerm.app" };

  test("opens the session and says which tab, with its ⌘ shortcut", () => {
    const runner = stubRunner([[["osascript"], { stdout: "6\n" }]]);
    expect(launchReport("/work/crm", ["prep", "gift-cards"], iTerm, runner)).toBe("Launched: iTerm tab 6 (⌘6) — gift-cards prep");
    expect(runner.calls).toHaveLength(1);
  });

  test("a tab past 9 has no shortcut, and output that isn't a tab number names the terminal only", () => {
    expect(launchReport("/work/crm", ["prep", "gift-cards"], iTerm, stubRunner([[["osascript"], { stdout: "12\n" }]]))).toBe("Launched: iTerm tab 12 — gift-cards prep");
    expect(launchReport("/work/crm", ["prep", "gift-cards"], iTerm, stubRunner([[["osascript"], {}]]))).toBe("Launched: iTerm — gift-cards prep");
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
    expect(launchReport("/w", ["prep"], iTerm, stubRunner([]))).toBe("launch: usage: launch <sub-command> <spec-name> [<phase>]");
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
  test("tmux opens a named window in the project directory without switching to it", () => {
    expect(launchArgv("tmux", giftCards)).toEqual(["tmux", "new-window", "-d", "-n", "gift-cards prep", "-c", "/work/crm", giftCards.command]);
  });

  test("iTerm types the line into the tab it created, then selects the tab you were in and finds the new tab's number", () => {
    const [osascript, flag, script = ""] = launchArgv("iTerm", { ...giftCards, shellLine: `cd '/a "b"\\c' && claude` });
    expect([osascript, flag]).toEqual(["osascript", "-e"]);
    const steps = [
      "set previousTab to current tab of home",
      "set newTab to (create tab with default profile)",
      "set newSession to current session of newTab",
      `tell newSession to write text "cd '/a \\"b\\"\\\\c' && claude"`,
      "select previousTab",
      "is unique ID of newSession then return tabNumber",
    ];
    expect(steps.map((step) => script.indexOf(step))).toEqual(steps.map((step) => script.indexOf(step)).toSorted((a, b) => a - b));
    expect(steps.every((step) => script.includes(step))).toBe(true);
    expect(script).not.toContain("current session of current window");
  });

  test("iTerm with no window open creates one, and has no tab to go back to", () => {
    const script = launchArgv("iTerm", giftCards)[2] ?? "";
    expect(script).toContain("create window with default profile");
    expect(script).toContain("current session of current tab of newWindow");
  });

  test("Terminal.app runs the line in a new window, then puts the window you were in back in front", () => {
    const script = launchArgv("Terminal", giftCards)[2] ?? "";
    expect(script).toContain(`do script "${giftCards.shellLine}"`);
    expect(script).toContain("set previousWindow to id of front window");
    expect(script).toContain("set index of window id previousWindow to 1");
    expect(script).not.toContain("activate");
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
    expect(sessionLaunch("/w", ["prep"])).toEqual({ ok: false, reason: "usage: launch <sub-command> <spec-name> [<phase>]" });
  });
});

describe("sessionLaunch with a phase", () => {
  test("execute carries the phase in the prompt and the title", () => {
    const launch = sessionLaunch("/trees/spec-board-pr-b", ["execute", "spec-board", "phase-6"]);
    expect(launch.ok && launch.value.title).toBe("spec-board execute 6");
    expect(launch.ok && launch.value.command).toBe("claude -n 'spec-board execute 6' '/spec-driven:spec execute spec-board 6'");
  });

  test("refuses a bad phase id, a phase on another sub-command, and extra words", () => {
    expect(sessionLaunch("/w", ["execute", "spec-board", "six"])).toEqual({ ok: false, reason: "not a phase id: six" });
    expect(sessionLaunch("/w", ["prep", "spec-board", "6"])).toEqual({ ok: false, reason: "a phase only goes with execute" });
    expect(sessionLaunch("/w", ["execute", "spec-board", "6", "now"])).toEqual({ ok: false, reason: "usage: launch <sub-command> <spec-name> [<phase>]" });
  });
});

describe("launchCommand", () => {
  const added: Placement = { kind: "added", path: "/trees/spec-board-pr-b", branch: "feat/spec-board-pr-b", how: "created", setup: { copied: [] } };

  test("execute with a phase places the tree, then launches in it", async () => {
    const runner = stubRunner([]);
    const places: string[] = [];
    const report = await launchCommand("/work/repo", ["execute", "spec-board", "6"], async (spec, phase) => {
      places.push(`${spec} ${phase}`);
      return { ok: true, value: added };
    }, {}, runner);
    expect(places).toEqual(["spec-board 6"]);
    expect(report).toBe([
      "Tree: /trees/spec-board-pr-b · feat/spec-board-pr-b · new branch from origin",
      "launch: run this in a new terminal: cd '/trees/spec-board-pr-b' && claude -n 'spec-board execute 6' '/spec-driven:spec execute spec-board 6'",
    ].join("\n"));
  });

  test("a busy tree is reported and nothing launches", async () => {
    const runner = stubRunner([]);
    const report = await launchCommand("/w", ["execute", "spec-board", "6"], async () => ({
      ok: true,
      value: { kind: "busy", branch: "feat/spec-board-pr-b", path: "/trees/spec-board-pr-b", holder: "after spec-board 5b (s-1)" },
    }), { TERM_PROGRAM: "iTerm.app" }, runner);
    expect(report).toBe("launch: /trees/spec-board-pr-b is busy, after spec-board 5b (s-1); not launched");
    expect(runner.calls).toEqual([]);
  });

  test("bad arguments never place a tree; without a phase it launches where it is", async () => {
    const place = async () => { throw new Error("must not place"); };
    expect(await launchCommand("/w", ["execute", "spec-board", "six"], place, {}, stubRunner([]))).toBe("launch: not a phase id: six");
    expect(await launchCommand("/w", ["prep", "gift-cards"], place, {}, stubRunner([]))).toStartWith("launch: run this in a new terminal: cd '/w' && ");
  });
});
