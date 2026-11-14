import { beforeEach, describe, expect, test } from "bun:test";
import type { FileChange, Tip } from "../core/land-on-ref";
import { serializeDoc } from "../record/document";
import type { RecordPort } from "../record/ref";

// What every RecordPort does, real or fake. `make` runs before each case and hands back a record that is
// absent on origin, with this machine online.
export interface RecordPortHarness {
  port: RecordPort;
  landElsewhere(changes: readonly FileChange[]): string;
  goOffline(): void;
  holdLock(): void;
  breakFetch(): void;
}

const PHASE = "specs/alpha/phases/1.json";
const NON_ASCII = serializeDoc({ id: "1", text: "Café — día ✓" });
const MISSING_BLOB = "0123456789abcdef0123456789abcdef01234567";

export function landed(port: RecordPort, base: Tip, changes: readonly FileChange[]): string {
  const commit = port.commit(base, changes, "record: test");
  if (!commit.ok) throw new Error(commit.reason);
  const pushed = port.push(commit.value, base);
  if (pushed.kind !== "pushed") throw new Error(`push ${pushed.kind}`);
  return commit.value;
}

export function recordPortContract(name: string, make: () => RecordPortHarness): void {
  describe(`RecordPort contract: ${name}`, () => {
    let world: RecordPortHarness;
    beforeEach(() => {
      world = make();
    });

    test("a record that doesn't exist yet is absent, not offline", () => {
      expect(world.port.fetchTip()).toEqual({ kind: "absent" });
    });

    test("commit ids are 40-hex shas", () => {
      const commit = world.port.commit({ kind: "absent" }, [{ path: PHASE, text: "{}\n" }], "record: first");
      expect(commit.ok && commit.value).toMatch(/^[0-9a-f]{40}$/);
    });

    test("a first push on an absent lease lands, and a fetch reads it back at that tip", () => {
      const sha = landed(world.port, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
      expect(world.port.fetchTip()).toEqual({ kind: "at", sha });
    });

    test("a second create-only push is refused", () => {
      world.landElsewhere([{ path: PHASE, text: "{}\n" }]);
      const rival = world.port.commit({ kind: "absent" }, [{ path: "x.json", text: "{}\n" }], "rival");
      expect(rival.ok && world.port.push(rival.value, { kind: "absent" })).toEqual({ kind: "refused" });
    });

    test("a lease on the tip lands, and deletes remove paths", () => {
      const first = landed(world.port, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
      const second = landed(world.port, { kind: "at", sha: first }, [{ path: PHASE, text: undefined }, { path: "y.json", text: "{}\n" }]);
      const paths = world.port.blobIdsByPath(second);
      expect(paths.ok && [...paths.value.keys()]).toEqual(["y.json"]);
    });

    test("a lease on a tip another machine moved is refused", () => {
      const first = landed(world.port, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
      world.landElsewhere([{ path: "raced.json", text: "{}\n" }]);
      const mine = world.port.commit({ kind: "at", sha: first }, [{ path: "mine.json", text: "{}\n" }], "mine");
      expect(mine.ok && world.port.push(mine.value, { kind: "at", sha: first })).toEqual({ kind: "refused" });
    });

    test("an unreachable origin is offline, at fetch and at push", () => {
      const commit = world.port.commit({ kind: "absent" }, [{ path: PHASE, text: "{}\n" }], "record: first");
      world.goOffline();
      expect(world.port.fetchTip().kind).toBe("offline");
      expect(commit.ok && world.port.push(commit.value, { kind: "absent" }).kind).toBe("offline");
    });

    test("a held lock on the tracking ref is busy", () => {
      world.landElsewhere([{ path: PHASE, text: "{}\n" }]);
      world.holdLock();
      expect(world.port.fetchTip().kind).toBe("busy");
    });

    test("a fetch that fails while origin still lists the record is failed, with a reason", () => {
      world.landElsewhere([{ path: PHASE, text: "{}\n" }]);
      world.breakFetch();
      const tip = world.port.fetchTip();
      expect(tip.kind).toBe("failed");
      expect(tip.kind === "failed" && tip.reason.length > 0).toBe(true);
    });

    test("non-ASCII documents round-trip through one batch read, keyed by blob id", () => {
      const sha = landed(world.port, { kind: "absent" }, [{ path: PHASE, text: NON_ASCII }, { path: "b.json", text: "{}\n" }]);
      const ids = world.port.blobIdsByPath(sha);
      if (!ids.ok) throw new Error(ids.reason);
      const texts = world.port.readBlobs([...ids.value.values()]);
      expect(texts.ok && texts.value.get(ids.value.get(PHASE) ?? "")).toBe(NON_ASCII);
      expect(texts.ok && texts.value.size).toBe(2);
      expect(world.port.readBlob(ids.value.get(PHASE) ?? "")).toEqual({ ok: true, value: NON_ASCII });
    });

    test("a missing blob is an error naming it, never a short map", () => {
      const sha = landed(world.port, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
      const ids = world.port.blobIdsByPath(sha);
      const present = ids.ok ? [...ids.value.values()] : [];
      expect(world.port.readBlobs([MISSING_BLOB, ...present])).toEqual({ ok: false, reason: `record blob ${MISSING_BLOB} is missing` });
      expect(world.port.readBlob(MISSING_BLOB).ok).toBe(false);
    });
  });
}
