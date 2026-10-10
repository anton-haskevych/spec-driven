import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readTextIfExists } from "../../core/files";
import { stateDir, type Git } from "../../core/git";
import type { Result } from "../../core/result";

export interface SavedLog {
  text: string;
  path?: string;
}

export type JobLogs = (jobId: number) => Result<SavedLog>;

export function jobLogDir(git: Git, pr: number): string | undefined {
  const dir = stateDir(git, "babysit", `pr-${pr}`);
  return dir.ok ? dir.value : undefined;
}

export function jobLogFile(dir: string, jobId: number): string {
  return join(dir, `job-${jobId}.log`);
}

// A re-run gets new job ids, so a saved log never goes stale: the agent reads the file, not GitHub.
export function savedJobLogs(download: (jobId: number) => Result<string>, dir: string | undefined): JobLogs {
  return (jobId) => {
    const file = dir === undefined ? undefined : jobLogFile(dir, jobId);
    const saved = file === undefined ? undefined : readTextIfExists(file);
    if (file !== undefined && saved !== undefined) return { ok: true, value: { text: saved, path: file } };
    const log = download(jobId);
    if (!log.ok) return log;
    return { ok: true, value: file !== undefined && save(file, log.value) ? { text: log.value, path: file } : { text: log.value } };
  };
}

function save(file: string, text: string): boolean {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    return true;
  } catch {
    return false;
  }
}
