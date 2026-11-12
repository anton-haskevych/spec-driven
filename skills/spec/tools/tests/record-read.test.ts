import { afterEach, describe, expect, test } from "bun:test";
import { gitAt, gitCommonDir } from "../core/git";
import type { TipRead } from "../core/land-on-ref";
import { serializeDoc } from "../record/document";
import { RECORD_LAYOUT } from "../record/layout";
import { gitRecordReadPort, readRecord, type RecordReadPort } from "../record/read";
import { gitRecordPort } from "../record/ref";
import { fakeRecord, type FakeRecord } from "./fake-record";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const NOW = new Date("2026-11-11T20:00:00Z");
const PHASE = "specs/alpha/phases/1.json";

interface Counting extends RecordReadPort {
  fetches: number;
  tracking: string | undefined;
  fetchedAt: Date | undefined;
}

function readPort(record: FakeRecord): Counting {
  const port: Counting = {
    fetches: 0,
    tracking: undefined,
    fetchedAt: undefined,
    fetchTip(): TipRead {
      port.fetches += 1;
      const tip = record.fetchTip();
      if (tip.kind === "at") port.tracking = tip.sha;
      return tip;
    },
    blobIdsByPath: record.blobIdsByPath,
    readBlobs: record.readBlobs,
    trackingTip: () => port.tracking,
    lastFetched: () => port.fetchedAt,
    markFetched: (at) => (port.fetchedAt = at),
  };
  return port;
}

function landed(record: FakeRecord, docs: Record<string, unknown>): void {
  record.landFromAnotherMachine(Object.entries(docs).map(([path, doc]) => ({ path, text: serializeDoc(doc) })));
}

describe("readRecord", () => {
  test("a fetch reads the tip live, every document in one go", () => {
    const record = fakeRecord();
    landed(record, { "meta.json": { layout: RECORD_LAYOUT }, [PHASE]: { id: "1", title: "Café — día" } });
    const port = readPort(record);
    const read = readRecord(port, { fetch: true, now: NOW });
    expect(read.kind === "read" && read.live).toBe(true);
    expect(read.kind === "read" ? read.view.doc(PHASE) : undefined).toEqual({ id: "1", title: "Café — día" });
    expect(port.fetches).toBe(1);
    expect(port.fetchedAt).toEqual(NOW);
  });

  test("no record on origin reads nothing", () => {
    expect(readRecord(readPort(fakeRecord()), { fetch: true, now: NOW })).toEqual({ kind: "none" });
  });

  test("without fetch it never asks origin, and reads the last fetched tip with its age", () => {
    const record = fakeRecord();
    landed(record, { [PHASE]: { id: "1" } });
    const port = readPort(record);
    readRecord(port, { fetch: true, now: new Date(NOW.getTime() - 14 * 60_000) });
    const read = readRecord(port, { fetch: false, now: NOW });
    expect(port.fetches).toBe(1);
    expect(read.kind === "read" ? [read.live, read.ageMs] : read).toEqual([false, 14 * 60_000]);
  });

  test("never fetched and not fetching: nothing, and no network", () => {
    const port = readPort(fakeRecord());
    expect(readRecord(port, { fetch: false, now: NOW })).toEqual({ kind: "none" });
    expect(port.fetches).toBe(0);
  });

  test("offline falls back to the last fetched tip and says why", () => {
    const record = fakeRecord();
    landed(record, { [PHASE]: { id: "1" } });
    const port = readPort(record);
    readRecord(port, { fetch: true, now: NOW });
    record.offline = true;
    const read = readRecord(port, { fetch: true, now: NOW });
    expect(read.kind === "read" ? [read.live, read.offline] : read).toEqual([false, "origin unreachable"]);
  });

  test("a record written by a newer layout reads nothing", () => {
    const record = fakeRecord();
    landed(record, { "meta.json": { layout: RECORD_LAYOUT + 1 }, [PHASE]: { id: "1" } });
    expect(readRecord(readPort(record), { fetch: true, now: NOW })).toEqual({ kind: "newer", layout: RECORD_LAYOUT + 1 });
  });
});

describe("gitRecordReadPort (real git)", () => {
  let repo: TestRepo;
  afterEach(() => repo.cleanup());

  test("reads a non-ASCII document whole through the batch read, and remembers when it fetched", () => {
    repo = repoWithOrigin("spec-record-read-");
    const git = gitAt(repo.dir, isolatedRunner);
    const writer = gitRecordPort(git);
    if (!writer) throw new Error("no origin");
    const commit = writer.commit({ kind: "absent" }, [
      { path: PHASE, text: serializeDoc({ id: "1", text: "Café — día ✓" }) },
      { path: "specs/alpha/spec.json", text: serializeDoc({ name: "alpha" }) },
    ], "record: first");
    if (!commit.ok) throw new Error(commit.reason);
    writer.push(commit.value, { kind: "absent" });

    const commonDir = gitCommonDir(git);
    if (!commonDir.ok) throw new Error(commonDir.reason);
    const port = gitRecordReadPort(git, commonDir.value);
    if (!port) throw new Error("no origin");
    const read = readRecord(port, { fetch: true, now: NOW });
    expect(read.kind === "read" ? read.view.doc(PHASE) : read).toEqual({ id: "1", text: "Café — día ✓" });
    expect(read.kind === "read" ? read.view.doc("specs/alpha/spec.json") : read).toEqual({ name: "alpha" });
    expect(port.lastFetched()).toEqual(NOW);
  });
});
