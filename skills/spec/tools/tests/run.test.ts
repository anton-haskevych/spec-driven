import { describe, expect, test } from "bun:test";
import { defaultBranch, systemRunner } from "../core/run";
import { stubRunner } from "./stub-runner";

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
