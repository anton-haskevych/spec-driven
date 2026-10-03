import type { Env } from "../core/env";
import type { SessionLaunch } from "./command-line";

export type Terminal = "tmux" | "iTerm" | "Terminal";

export function pickTerminal(env: Env): Terminal | undefined {
  if (env.TMUX) return "tmux";
  if (env.TERM_PROGRAM === "iTerm.app") return "iTerm";
  if (env.TERM_PROGRAM === "Apple_Terminal") return "Terminal";
  return undefined;
}

export function launchArgv(terminal: Terminal, launch: SessionLaunch): string[] {
  switch (terminal) {
    case "tmux":
      return ["tmux", "new-window", "-d", "-n", launch.title, "-c", launch.projectDir, launch.command];
    case "iTerm":
      return ["osascript", "-e", iTermScript(launch.shellLine)];
    case "Terminal":
      return ["osascript", "-e", terminalScript(launch.shellLine)];
  }
}

// Writes into the session the script created, never `current session`: whatever is in front at that
// instant may be another launch's tab or the one the user just clicked. iTerm 3.6 can't read a tab's
// `index` (-1728), so the tab number is found by session id. `claude -n` titles the tab itself.
function iTermScript(shellLine: string): string {
  return [
    `tell application "iTerm"`,
    `  if (count of windows) = 0 then`,
    `    set newWindow to (create window with default profile)`,
    `    tell current session of current tab of newWindow to write text ${appleScriptString(shellLine)}`,
    `    return 1`,
    `  end if`,
    `  set home to current window`,
    `  set previousTab to current tab of home`,
    `  tell home to set newTab to (create tab with default profile)`,
    `  set newSession to current session of newTab`,
    `  tell newSession to write text ${appleScriptString(shellLine)}`,
    `  select previousTab`,
    `  repeat with tabNumber from 1 to count of tabs of home`,
    `    if unique ID of current session of tab tabNumber of home is unique ID of newSession then return tabNumber`,
    `  end repeat`,
    `end tell`,
  ].join("\n");
}

// By id: `front window` is resolved by position, and after `do script` the new window is in front.
function terminalScript(shellLine: string): string {
  return [
    `tell application "Terminal"`,
    `  set hadWindow to (count of windows) > 0`,
    `  if hadWindow then set previousWindow to id of front window`,
    `  do script ${appleScriptString(shellLine)}`,
    `  if hadWindow then set index of window id previousWindow to 1`,
    `end tell`,
  ].join("\n");
}

function appleScriptString(text: string): string {
  return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
