import type { Runner } from "../core/run";
import type { ProcStarts } from "./live";

const PS_ROW = /^\s*(\d+)\s+(.+?)\s*$/;

// Session files record procStart in UTC, while ps prints lstart in the local zone.
export function psProcStarts(runner: Runner): ProcStarts {
  return (pids) => {
    if (pids.length === 0) return new Map();
    return parseProcStarts(runner.run(["ps", "-o", "pid=,lstart=", "-p", pids.join(",")], { env: { TZ: "UTC" } }).stdout);
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
