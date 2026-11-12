import { describe, expect, test } from "bun:test";
import { gitAt } from "../core/git";
import { timedOutAfter, type RunOptions, type Runner, type RunResult } from "../core/run";
import { fetchRecordTip } from "../record/ref";

type Call = { argv: readonly string[]; options?: RunOptions };

function scripted(reply: (argv: readonly string[]) => RunResult): Runner & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    run(argv, options) {
      calls.push({ argv, ...(options ? { options } : {}) });
      return reply(argv);
    },
  };
}

const gitVerb = (call: Call) => call.argv[1];

describe("fetchRecordTip", () => {
  test("a fetch that ran out of time is offline at once: no ls-remote waits out a second limit", () => {
    const runner = scripted(() => ({ code: 1, stdout: "", stderr: timedOutAfter(3_000) }));
    expect(fetchRecordTip(gitAt("/w", runner), 3_000)).toEqual({ kind: "offline", reason: timedOutAfter(3_000) });
    expect(runner.calls.map(gitVerb)).toEqual(["fetch"]);
    expect(runner.calls[0]?.options?.timeoutMs).toBe(3_000);
  });

  test("any other failed fetch still asks ls-remote whether the record exists", () => {
    const runner = scripted((argv) => (argv[1] === "ls-remote" ? { code: 2, stdout: "", stderr: "" } : { code: 128, stdout: "", stderr: "fatal: couldn't find remote ref" }));
    expect(fetchRecordTip(gitAt("/w", runner))).toEqual({ kind: "absent" });
    expect(runner.calls.map(gitVerb)).toEqual(["fetch", "ls-remote", "update-ref"]);
    expect(runner.calls[0]?.options?.timeoutMs).toBe(10_000);
  });
});
