import type { Runner } from "../core/run";
import type { ProcStarts } from "./live";
import { statStartTime, systemProcfs, type Procfs } from "./procfs";

const PS_ROW = /^\s*(\d+)\s+(.+?)\s*$/;

// Session files record procStart in UTC, while ps prints lstart in the local zone. On Linux the
// file holds clock ticks instead, so each pid answers in both forms.
export function psProcStarts(runner: Runner, procfs: Procfs | undefined = systemProcfs()): ProcStarts {
  return (pids) => {
    if (pids.length === 0) return new Map();
    const listed = parseProcStarts(runner.run(["ps", "-o", "pid=,lstart=", "-p", pids.join(",")], { env: { TZ: "UTC" } }).stdout);
    const starts = new Map<number, string[]>();
    for (const pid of pids) {
      const stat = procfs?.stat(pid);
      const forms = [listed.get(pid), stat && statStartTime(stat)].filter((form): form is string => Boolean(form));
      if (forms.length > 0) starts.set(pid, forms);
    }
    return starts;
  };
}

export function parseProcStarts(stdout: string): Map<number, string> {
  const starts = new Map<number, string>();
  for (const line of stdout.split("\n")) {
    const match = PS_ROW.exec(line);
    if (match?.[1] && match[2]) starts.set(Number(match[1]), match[2]);
  }
  return starts;
}
