import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result } from "../core/result";
import { jobLogFile, savedJobLogs } from "../pr/failures/job-logs";

function countingDownload(reply: Result<string>) {
  const calls: number[] = [];
  return { calls, download: (jobId: number) => (calls.push(jobId), reply) };
}

describe("savedJobLogs", () => {
  test("downloads a job's log once, saves it and hands back the path", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "job-logs-")), "babysit", "pr-921");
    const { calls, download } = countingDownload({ ok: true, value: "full log" });
    const logs = savedJobLogs(download, dir);

    expect(logs(9921)).toEqual({ ok: true, value: { text: "full log", path: jobLogFile(dir, 9921) } });
    expect(readFileSync(jobLogFile(dir, 9921), "utf8")).toBe("full log");
    expect(logs(9921)).toEqual({ ok: true, value: { text: "full log", path: jobLogFile(dir, 9921) } });
    expect(calls).toEqual([9921]);
  });

  test("a log already on disk is read, never downloaded again", () => {
    const dir = mkdtempSync(join(tmpdir(), "job-logs-"));
    writeFileSync(jobLogFile(dir, 7), "from an earlier pr status");
    const { calls, download } = countingDownload({ ok: true, value: "fresh" });
    expect(savedJobLogs(download, dir)(7)).toEqual({ ok: true, value: { text: "from an earlier pr status", path: jobLogFile(dir, 7) } });
    expect(calls).toEqual([]);
  });

  test("with no place to save, the text still comes back, without a path", () => {
    const { download } = countingDownload({ ok: true, value: "log" });
    expect(savedJobLogs(download, undefined)(7)).toEqual({ ok: true, value: { text: "log" } });
    const unwritable = join(mkdtempSync(join(tmpdir(), "job-logs-")), "file");
    writeFileSync(unwritable, "");
    expect(savedJobLogs(download, join(unwritable, "pr-1"))(7)).toEqual({ ok: true, value: { text: "log" } });
  });

  test("a failed download is the reason, and nothing is saved", () => {
    const dir = mkdtempSync(join(tmpdir(), "job-logs-"));
    const { download } = countingDownload({ ok: false, reason: "gh call budget (30) spent" });
    expect(savedJobLogs(download, dir)(7)).toEqual({ ok: false, reason: "gh call budget (30) spent" });
    expect(() => readFileSync(jobLogFile(dir, 7))).toThrow();
  });
});
