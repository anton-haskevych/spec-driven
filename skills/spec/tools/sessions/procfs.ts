import { readFileSync } from "node:fs";
import type { StartDirs } from "./live";

// Claude Code on Linux records procStart as the process's start in clock ticks (field 22 of
// /proc/<pid>/stat), not ps's lstart; the folder a session was launched in, which its project
// hooks `cd` into for its whole life, is the PWD in its environment.
export interface Procfs {
  stat(pid: number): string | undefined;
  environ(pid: number): string | undefined;
}

const START_TIME_AFTER_COMMAND = 19;

export function systemProcfs(platform: string = process.platform): Procfs | null {
  if (platform !== "linux") return null;
  return { stat: (pid) => readProc(pid, "stat"), environ: (pid) => readProc(pid, "environ") };
}

// The command name (field 2) may hold spaces and parentheses, so fields count from its last ")".
export function statStartTime(stat: string): string | undefined {
  return stat.slice(stat.lastIndexOf(")") + 1).trim().split(/\s+/)[START_TIME_AFTER_COMMAND];
}

export function environPwd(environ: string): string | undefined {
  const pwd = environ.split("\0").find((pair) => pair.startsWith("PWD="))?.slice("PWD=".length);
  return pwd || undefined;
}

export function procStartDirs(procfs: Procfs | null = systemProcfs()): StartDirs {
  return (pids) => {
    const dirs = new Map<number, string>();
    if (!procfs) return dirs;
    for (const pid of pids) {
      const environ = procfs.environ(pid);
      const pwd = environ && environPwd(environ);
      if (pwd) dirs.set(pid, pwd);
    }
    return dirs;
  };
}

function readProc(pid: number, file: string): string | undefined {
  try {
    return readFileSync(`/proc/${pid}/${file}`, "utf8");
  } catch {
    return undefined;
  }
}
