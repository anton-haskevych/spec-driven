import { describe, expect, test } from "bun:test";
import { landOnRef, type RefEdit, type Tip } from "../core/land-on-ref";
import { fakeRef, type FakeRef } from "./fake-ref";

const LIST = "list.txt";
const noPause = async () => {};

function appendLine(ref: FakeRef, line: string) {
  return (tip: Tip): RefEdit<string, string> => {
    const text = ref.filesAt(tip.kind === "at" ? tip.sha : undefined).get(LIST) ?? "";
    if (text.includes(line)) return { kind: "stop", outcome: `${line} already there` };
    return { kind: "commit", changes: [{ path: LIST, text: `${text}${line}\n` }], message: `add ${line}`, landed: line };
  };
}

const land = (ref: FakeRef, line: string, attempts?: number) => landOnRef(ref, appendLine(ref, line), { name: "the list", pause: noPause, ...(attempts ? { attempts } : {}) });

describe("landOnRef", () => {
  test("the first write creates the ref with a parentless commit", async () => {
    const ref = fakeRef();
    const outcome = await land(ref, "one");
    expect(outcome).toMatchObject({ kind: "landed", landed: "one" });
    expect(ref.commits.get(ref.tip ?? "")?.parent).toBeUndefined();
    expect(ref.filesAt(ref.tip).get(LIST)).toBe("one\n");
  });

  test("a stopping plan writes nothing and hands back its outcome", async () => {
    const ref = fakeRef();
    ref.landFromAnotherMachine([{ path: LIST, text: "one\n" }]);
    const before = ref.tip;
    expect(await land(ref, "one")).toEqual({ kind: "stopped", outcome: "one already there" });
    expect(ref.tip).toBe(before);
  });

  test("a push that loses the race plans again on the new tip", async () => {
    const ref = fakeRef();
    ref.landFromAnotherMachine([{ path: LIST, text: "one\n" }]);
    ref.racerBeforeNextPush = () => ref.landFromAnotherMachine([{ path: LIST, text: "one\nraced\n" }]);
    expect(await land(ref, "mine")).toMatchObject({ kind: "landed" });
    expect(ref.filesAt(ref.tip).get(LIST)).toBe("one\nraced\nmine\n");
  });

  test("a busy ref lock is retried after a pause, not reported", async () => {
    const ref = fakeRef();
    ref.busyFetches = 2;
    const pauses: number[] = [];
    const outcome = await landOnRef(ref, appendLine(ref, "one"), { name: "the list", pause: async (ms) => void pauses.push(ms) });
    expect(outcome.kind).toBe("landed");
    expect(pauses).toHaveLength(2);
  });

  test("an unreachable origin is offline, at fetch or at push", async () => {
    const ref = fakeRef();
    ref.offline = true;
    expect((await land(ref, "one")).kind).toBe("offline");
    ref.offline = false;
    ref.racerBeforeNextPush = () => {
      ref.offline = true;
    };
    expect((await land(ref, "one")).kind).toBe("offline");
  });

  test("a ref that keeps moving fails after the last attempt, naming it", async () => {
    const ref = fakeRef();
    const raceEveryPush = (tip: Tip): RefEdit<string, string> => {
      ref.racerBeforeNextPush = () => ref.landFromAnotherMachine([{ path: "other", text: String(Math.random()) }]);
      return appendLine(ref, "mine")(tip);
    };
    const outcome = await landOnRef(ref, raceEveryPush, { name: "the list", pause: noPause, attempts: 3 });
    expect(outcome).toEqual({ kind: "failed", reason: "the list moved 3 times while writing; nothing written — run it again" });
  });
});
