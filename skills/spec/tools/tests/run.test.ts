import { describe, expect, test } from "bun:test";
import { defaultBranch, runAll, systemAsyncRunner, systemRunner, type AsyncRunner, type RunResult } from "../core/run";
import { asyncStubRunner, stubRunner } from "./stub-runner";

describe("systemRunner", () => {
  test("returns exit code and output of an argv command, without a shell", () => {
    const result = systemRunner.run(["printf", "%s", "$HOME"]);
    expect(result).toEqual({ code: 0, stdout: "$HOME", stderr: "" });
  });

  test("merges extra env over the current environment", () => {
    const result = systemRunner.run(["sh", "-c", 'printf "%s:%s" "$SPEC_RUN_PROBE" "${PATH:+path}"'], { env: { SPEC_RUN_PROBE: "x" } });
    expect(result.stdout).toBe("x:path");
  });

  test("kills a command that outlives timeoutMs and says so in stderr", () => {
    const started = performance.now();
    const result = systemRunner.run(["sleep", "5"], { timeoutMs: 200 });
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toBe("timed out after 200 ms");
  });

  test("turns a missing binary into exit code 127 instead of throwing", () => {
    const result = systemRunner.run(["spec-driven-no-such-binary"]);
    expect(result.code).toBe(127);
  });
});

describe("systemAsyncRunner", () => {
  test("returns exit code and output of an argv command, without a shell", async () => {
    const result = await systemAsyncRunner.run(["sh", "-c", 'printf "%s" "$SPEC_RUN_PROBE"; printf err >&2; exit 3'], { env: { SPEC_RUN_PROBE: "$HOME" } });
    expect(result).toEqual({ code: 3, stdout: "$HOME", stderr: "err" });
  });

  test("runs in cwd", async () => {
    const result = await systemAsyncRunner.run(["pwd"], { cwd: "/" });
    expect(result.stdout.trim()).toBe("/");
  });

  test("kills a command that outlives timeoutMs and says so in stderr", async () => {
    const started = performance.now();
    const result = await systemAsyncRunner.run(["sleep", "5"], { timeoutMs: 200 });
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toBe("timed out after 200 ms");
  });

  test("turns a missing binary into exit code 127 instead of rejecting", async () => {
    const result = await systemAsyncRunner.run(["spec-driven-no-such-binary"]);
    expect(result.code).toBe(127);
  });
});

describe("runAll", () => {
  function gatedRunner() {
    let running = 0;
    let peak = 0;
    const runner: AsyncRunner = {
      async run(argv) {
        running++;
        peak = Math.max(peak, running);
        await Bun.sleep(Number(argv[1]));
        running--;
        return { code: 0, stdout: argv[0] ?? "", stderr: "" };
      },
    };
    return { runner, peak: () => peak };
  }

  test("keeps results in job order whatever order they finish in", async () => {
    const { runner } = gatedRunner();
    const results = await runAll(runner, [{ argv: ["a", "30"] }, { argv: ["b", "1"] }, { argv: ["c", "10"] }], 3);
    expect(results.map((result) => result.stdout)).toEqual(["a", "b", "c"]);
  });

  test("never runs more jobs at once than the concurrency cap", async () => {
    const { runner, peak } = gatedRunner();
    await runAll(runner, Array.from({ length: 9 }, (_, index) => ({ argv: [String(index), "5"] })), 3);
    expect(peak()).toBe(3);
  });

  test("turns a job that throws into a 127 result instead of rejecting", async () => {
    const runner: AsyncRunner = {
      run: async (argv) => {
        if (argv[0] === "boom") throw new Error("spawn failed");
        return { code: 0, stdout: "ok", stderr: "" };
      },
    };
    const results = await runAll(runner, [{ argv: ["boom"] }, { argv: ["fine"] }], 2);
    expect(results).toEqual([{ code: 127, stdout: "", stderr: "spawn failed" }, { code: 0, stdout: "ok", stderr: "" }]);
  });

  test("passes each job's options through", async () => {
    const runner = asyncStubRunner([[["git"], { stdout: "x" }]]);
    const results: RunResult[] = await runAll(runner, [{ argv: ["git", "status"], options: { cwd: "/w" } }], 8);
    expect(results[0]?.stdout).toBe("x");
    expect(runner.calls).toEqual([{ argv: ["git", "status"], cwd: "/w" }]);
  });

  test("returns nothing for no jobs", async () => {
    expect(await runAll(asyncStubRunner([]), [], 8)).toEqual([]);
  });
});

describe("defaultBranch", () => {
  test("reads origin/HEAD", () => {
    const runner = stubRunner([[["git", "symbolic-ref"], { stdout: "origin/trunk\n" }]]);
    expect(defaultBranch("/repo", runner)).toBe("trunk");
  });

  test("falls back to gh when origin/HEAD is unset", () => {
    const runner = stubRunner([[["gh", "repo", "view"], { stdout: "main\n" }]]);
    expect(defaultBranch("/repo", runner)).toBe("main");
  });

  test("gives up when neither answers", () => {
    expect(defaultBranch("/repo", stubRunner([]))).toBeUndefined();
  });
});
