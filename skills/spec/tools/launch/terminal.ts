import type { SessionLaunch } from "./command-line";

export type Terminal = "tmux" | "iTerm" | "Terminal";

export type Env = Readonly<Record<string, string | undefined>>;

export function pickTerminal(env: Env): Terminal | undefined {
  if (env.TMUX) return "tmux";
  if (env.TERM_PROGRAM === "iTerm.app") return "iTerm";
  if (env.TERM_PROGRAM === "Apple_Terminal") return "Terminal";
  return undefined;
}

export function launchArgv(terminal: Terminal, launch: SessionLaunch): string[] {
  switch (terminal) {
    case "tmux":
      return ["tmux", "new-window", "-n", launch.title, "-c", launch.projectDir, launch.command];
    case "iTerm":
      return ["osascript", "-e", iTermScript(launch.shellLine)];
    case "Terminal":
      return ["osascript", "-e", `tell application "Terminal" to do script ${appleScriptString(launch.shellLine)}`, "-e", `tell application "Terminal" to activate`];
  }
}

function iTermScript(shellLine: string): string {
  return [
    `tell application "iTerm"`,
    `  if (count of windows) is 0 then`,
    `    create window with default profile`,
    `  else`,
    `    tell current window to create tab with default profile`,
    `  end if`,
    `  tell current session of current window to write text ${appleScriptString(shellLine)}`,
    `end tell`,
  ].join("\n");
}

function appleScriptString(text: string): string {
  return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
