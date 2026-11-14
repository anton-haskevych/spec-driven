import { describe, expect, test } from "bun:test";
import { phaseDocPath } from "../plan/kinds";
import { commitLog, docOf, fakeRecord, fakeRecordReadPort, recordPhaseOf, seedRecord } from "./fake-record";
import { recordPortContract } from "./record-port-contract";
import { recordReadPortContract } from "./record-read-port-contract";

recordPortContract("fakeRecord", () => {
  const record = fakeRecord();
  return {
    port: record,
    landElsewhere: (changes) => record.landFromAnotherMachine(changes),
    goOffline: () => {
      record.offline = true;
    },
    holdLock: () => {
      record.busyFetches = 1;
    },
    breakFetch: () => record.failNextFetch(),
  };
});

recordReadPortContract("fakeRecordReadPort", () => {
  const record = fakeRecord();
  return {
    port: record,
    read: fakeRecordReadPort(record),
    newRead: () => fakeRecordReadPort(record),
    landElsewhere: (changes) => record.landFromAnotherMachine(changes),
    deleteOnOrigin: () => {
      record.tip = undefined;
    },
  };
});

describe("fake record read-backs", () => {
  test("seeded documents read back as docs, by path or by spec and phase, with the commits newest first", () => {
    const record = fakeRecord();
    seedRecord(record, { [phaseDocPath("alpha", "1")]: { id: "1" } });
    seedRecord(record, { "meta.json": { layout: 4 } });
    expect(recordPhaseOf(record, "alpha", "1")).toEqual({ id: "1" });
    expect(docOf(record, "meta.json")).toEqual({ layout: 4 });
    expect(docOf(record, "none.json")).toBeUndefined();
    expect(commitLog(record)).toEqual(["elsewhere", "elsewhere"]);
  });
});
