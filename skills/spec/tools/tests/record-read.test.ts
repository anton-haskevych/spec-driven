import { describe, expect, test } from "bun:test";
import { RECORD_LAYOUT } from "../record/layout";
import { readRecord } from "../record/read";
import { fakeRecord, fakeRecordReadPort, seedRecord } from "./fake-record";

const NOW = new Date("2026-11-11T20:00:00Z");
const PHASE = "specs/alpha/phases/1.json";

describe("readRecord", () => {
  test("a fetch reads the tip live, every document in one go", () => {
    const record = fakeRecord();
    seedRecord(record, { "meta.json": { layout: RECORD_LAYOUT }, [PHASE]: { id: "1", title: "Café — día" } });
    const read = readRecord(fakeRecordReadPort(record), { fetch: true, now: NOW });
    expect(read.kind === "read" && read.live).toBe(true);
    expect(read.kind === "read" ? read.view.doc(PHASE) : undefined).toEqual({ id: "1", title: "Café — día" });
    expect(record.fetches).toBe(1);
    expect(record.fetchedAt).toEqual(NOW);
  });

  test("no record on origin reads nothing", () => {
    expect(readRecord(fakeRecordReadPort(fakeRecord()), { fetch: true, now: NOW })).toEqual({ kind: "none" });
  });

  test("without fetch it never asks origin, and reads the last fetched tip with its age", () => {
    const record = fakeRecord();
    seedRecord(record, { [PHASE]: { id: "1" } });
    const port = fakeRecordReadPort(record);
    readRecord(port, { fetch: true, now: new Date(NOW.getTime() - 14 * 60_000) });
    const read = readRecord(port, { fetch: false, now: NOW });
    expect(record.fetches).toBe(1);
    expect(read.kind === "read" ? [read.live, read.ageMs] : read).toEqual([false, 14 * 60_000]);
  });

  test("never fetched and not fetching: nothing, and no network", () => {
    const record = fakeRecord();
    expect(readRecord(fakeRecordReadPort(record), { fetch: false, now: NOW })).toEqual({ kind: "none" });
    expect(record.fetches).toBe(0);
  });

  test("offline falls back to the last fetched tip and says why", () => {
    const record = fakeRecord();
    seedRecord(record, { [PHASE]: { id: "1" } });
    const port = fakeRecordReadPort(record);
    readRecord(port, { fetch: true, now: NOW });
    record.offline = true;
    const read = readRecord(port, { fetch: true, now: NOW });
    expect(read.kind === "read" ? [read.live, read.offline] : read).toEqual([false, "origin unreachable"]);
  });

  test("a record written by a newer layout reads nothing", () => {
    const record = fakeRecord();
    seedRecord(record, { "meta.json": { layout: RECORD_LAYOUT + 1 }, [PHASE]: { id: "1" } });
    expect(readRecord(fakeRecordReadPort(record), { fetch: true, now: NOW })).toEqual({ kind: "newer", layout: RECORD_LAYOUT + 1 });
  });
});
