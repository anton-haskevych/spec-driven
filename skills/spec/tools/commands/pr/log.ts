import { parseArgs } from "node:util";
import { gitAt, stateDir, type Git } from "../../core/git";
import type { Result } from "../../core/result";
import { systemRunner, type Runner } from "../../core/run";
import { appendEvent, readEvents, renderTimeline, type BabysitEvent } from "../../pr/babysit/log";
import { ghClient } from "../../pr/gh";
import { parsePrNumber, resolvePr } from "../../pr/resolve";

export const PR_LOG_USAGE = 'pr log [<pr> | <spec-name> [<group>]] [--add "<text>" | --start <spec-name> --group <group> | --pushed | --stopped "<why>"]';

// The babysit procedure's own events: the 3-hour clock starts at babysit-start, fix pushes are counted.
type LogWrite = { kind: "note"; text: string } | { kind: "start"; spec: string; group: string } | { kind: "pushed" } | { kind: "stopped"; text: string };

interface LogArgs {
  target: string[];
  write?: LogWrite;
}

const SHORT_SHA = 7;

export function prLog(
  projectDir: string,
  args: readonly string[],
  runner: Runner = systemRunner,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  const parsed = parseLogArgs(args);
  if (typeof parsed === "string") return parsed;
  const pr = prNumber(projectDir, parsed.target, runner);
  if (!pr.ok) return `pr log: ${pr.reason}`;
  const git = gitAt(projectDir, runner);
  const dir = stateDir(git, "babysit");
  if (!dir.ok) return `pr log: ${dir.reason}`;
  if (!parsed.write) return renderTimeline(pr.value, readEvents(dir.value, pr.value), timeZone);
  const event = eventFor(parsed.write, git);
  if (!event.ok) return `pr log: ${event.reason}`;
  appendEvent(dir.value, pr.value, { at: now.toISOString(), ...event.value });
  return `PR #${pr.value}: ${confirmation(parsed.write, event.value)}`;
}

function eventFor(write: LogWrite, git: Git): Result<Omit<BabysitEvent, "at">> {
  switch (write.kind) {
    case "note":
      return { ok: true, value: { event: "note", detail: write.text } };
    case "start":
      return { ok: true, value: { event: "babysit-start", spec: write.spec, group: write.group } };
    case "stopped":
      return { ok: true, value: { event: "stopped", detail: write.text } };
    case "pushed": {
      const sha = git.out(["rev-parse", `--short=${SHORT_SHA}`, "HEAD"]);
      if (!sha.ok) return sha;
      const subject = git.out(["log", "-1", "--format=%s"]);
      return { ok: true, value: { event: "pushed", sha: sha.value, detail: [sha.value, subject.ok ? subject.value : undefined].filter(Boolean).join(" · ") } };
    }
  }
}

function confirmation(write: LogWrite, event: Omit<BabysitEvent, "at">): string {
  switch (write.kind) {
    case "note":
      return "note added";
    case "start":
      return "babysit started";
    case "pushed":
      return `push logged · ${event.sha}`;
    case "stopped":
      return "stop logged";
  }
}

function parseLogArgs(args: readonly string[]): LogArgs | string {
  try {
    const options = { add: { type: "string" }, start: { type: "string" }, group: { type: "string" }, pushed: { type: "boolean" }, stopped: { type: "string" } } as const;
    const { values, positionals } = parseArgs({ args: [...args], options, allowPositionals: true, strict: true });
    if (positionals.length > 2) return `usage: ${PR_LOG_USAGE}`;
    const writes = [values.add, values.start, values.pushed, values.stopped].filter((value) => value !== undefined);
    if (writes.length > 1) return "pr log: one of --add, --start, --pushed, --stopped per call";
    const write = logWrite(values);
    return typeof write === "string" ? write : { target: positionals, ...(write ? { write } : {}) };
  } catch {
    return `usage: ${PR_LOG_USAGE}`;
  }
}

function logWrite(values: { add?: string; start?: string; group?: string; pushed?: boolean; stopped?: string }): LogWrite | undefined | string {
  if (values.add !== undefined) return values.add.trim() ? { kind: "note", text: values.add.trim() } : "pr log: --add needs the note's text";
  if (values.stopped !== undefined) return values.stopped.trim() ? { kind: "stopped", text: values.stopped.trim() } : "pr log: --stopped needs the reason";
  if (values.pushed) return { kind: "pushed" };
  if (values.start === undefined) return undefined;
  return values.group ? { kind: "start", spec: values.start, group: values.group } : "pr log: --start needs --group <group>";
}

function prNumber(projectDir: string, target: readonly string[], runner: Runner): Result<number> {
  const number = target.length === 1 ? parsePrNumber(target[0]!) : undefined;
  if (number !== undefined) return { ok: true, value: number };
  const resolved = resolvePr(ghClient(projectDir, runner), projectDir, target);
  return resolved.ok ? { ok: true, value: resolved.value.view.number } : resolved;
}
