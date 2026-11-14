import { beforeEach, describe, expect, test } from "bun:test";
import type { FileChange } from "../core/land-on-ref";
import type { RecordReadPort } from "../record/read";
import type { RecordPort } from "../record/ref";
import { landed } from "./record-port-contract";

// A write port and the read port of the same clone, linked as in git: both move one tracking ref.
// `make` runs before each case: no record on origin, no tracking tip, never fetched.
export interface RecordReadHarness {
  port: RecordPort;
  read: RecordReadPort;
  newRead(): RecordReadPort;
  landElsewhere(changes: readonly FileChange[]): string;
  deleteOnOrigin(): void;
}

const DOC = [{ path: "a.json", text: "{}\n" }];
const AT = new Date("2026-11-11T20:00:00Z");

export function recordReadPortContract(name: string, make: () => RecordReadHarness): void {
  describe(`RecordReadPort contract: ${name}`, () => {
    let world: RecordReadHarness;
    beforeEach(() => {
      world = make();
    });

    test("nothing fetched yet: no tracking tip and no fetch time", () => {
      expect([world.read.trackingTip(), world.read.lastFetched()]).toEqual([undefined, undefined]);
    });

    test("a push moves the tracking tip", () => {
      const sha = landed(world.port, { kind: "absent" }, DOC);
      expect(world.read.trackingTip()).toBe(sha);
    });

    test("a fetch moves the tracking tip to what another machine landed", () => {
      const sha = world.landElsewhere(DOC);
      expect(world.read.fetchTip()).toEqual({ kind: "at", sha });
      expect(world.read.trackingTip()).toBe(sha);
    });

    test("a fetch that finds no record clears the tracking tip", () => {
      landed(world.port, { kind: "absent" }, DOC);
      world.deleteOnOrigin();
      expect(world.read.fetchTip()).toEqual({ kind: "absent" });
      expect(world.read.trackingTip()).toBeUndefined();
    });

    test("the fetch time survives a new read port on the same clone", () => {
      world.read.markFetched(AT);
      expect(world.newRead().lastFetched()).toEqual(AT);
    });
  });
}
