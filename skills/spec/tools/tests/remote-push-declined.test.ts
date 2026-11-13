import { describe, expect, test } from "bun:test";
import { pushDeclined } from "../core/remote-push";

const REF = "refs/heads/main";
const result = (stdout: string, stderr = "") => ({ code: 1, stdout, stderr });
const to = "To https://github.com/o/r.git\n";

describe("pushDeclined", () => {
  test("a hook or rule on the server that turns the push down is a decline, with git's reason", () => {
    const stderr = "remote: error: GH006: Protected branch update failed\nerror: failed to push some refs\n";
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[remote rejected] (protected branch hook declined)\nDone\n`, stderr), REF)).toBe("protected branch hook declined");
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[remote rejected] (pre-receive hook declined)\nDone\n`), REF)).toBe("pre-receive hook declined");
  });

  test("a lost race is not a decline", () => {
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[rejected] (stale info)\nDone\n`), REF)).toBeUndefined();
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[rejected] (fetch first)\nDone\n`), REF)).toBeUndefined();
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[remote rejected] (failed to update ref)\nDone\n`), REF)).toBeUndefined();
    expect(pushDeclined(result(`${to}!\tabc:${REF}\t[remote rejected] (incorrect old value provided)\nDone\n`), REF)).toBeUndefined();
  });

  test("a push that landed, or never reached origin, is not a decline", () => {
    expect(pushDeclined({ code: 0, stdout: `${to} \tabc:${REF}\t1..2\nDone\n`, stderr: "" }, REF)).toBeUndefined();
    expect(pushDeclined(result("", "fatal: unable to access\n"), REF)).toBeUndefined();
  });
});
