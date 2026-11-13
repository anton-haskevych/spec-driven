import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDoc } from "../record/document";
import { dropEntry, flushOutbox, listOutbox, OUTBOX_LOCK, queueIntent, refusedFor, sendIntent, type IntentRunners } from "../record/outbox";
import type { RecordView } from "../record/view";
import { fakeRecord, type FakeRecord } from "./fake-record";

const LIST = "specs/alpha/list.json";
const NOW = new Date("2026-11-11T20:00:00Z");
const items = (view: RecordView): string[] => ((view.doc(LIST) as { items?: string[] } | undefined)?.items ?? []);

const runners: IntentRunners = {
  add: (args) => (view) => ({ ops: [{ op: "replace", path: LIST, doc: { items: [...items(view), String(args)] } }] }),
  close: (args) => (view) => (items(view).includes(String(args)) ? { ops: [{ op: "replace", path: LIST, doc: { items: items(view).filter((item) => item !== args) } }] } : { refused: `${String(args)} was already closed` }),
};
const options = { validate: () => [], pause: async () => {} };
const listAtTip = (record: FakeRecord) => parseDoc(record.filesAt(record.tip).get(LIST) ?? "");

describe("the outbox of intents", () => {
  let dir: string;
  let record: FakeRecord;

  beforeEach(() => {
    dir = join(mkdtempSync(join(tmpdir(), "spec-outbox-")), "outbox");
    record = fakeRecord();
  });
  afterEach(() => rmSync(join(dir, ".."), { recursive: true, force: true }));

  test("an unreachable origin queues the intent, not its ops", async () => {
    record.offline = true;
    expect(await sendIntent(record, dir, { session: "s1", command: "add", args: "a" }, runners, options, NOW)).toEqual({ kind: "queued", pending: 1 });
    expect(listOutbox(dir)).toEqual([{ n: 1, session: "s1", command: "add", args: "a", queuedAt: NOW.toISOString() }]);
  });

  test("a runner that can't reach origin before it plans leaves its entry queued, unmarked", async () => {
    queueIntent(dir, { session: "s1", command: "push-first", args: "a" }, NOW);
    const offlineFirst: IntentRunners = { ...runners, "push-first": () => ({ offline: "origin unreachable" }) };
    expect(await flushOutbox(record, dir, offlineFirst, options)).toEqual({ kind: "offline", pending: 1 });
    expect(listOutbox(dir)[0]?.refused).toBeUndefined();
  });

  test("entries take the next free number, never another's", () => {
    expect(queueIntent(dir, { session: "s1", command: "add", args: "a" }, NOW)).toBe(1);
    expect(queueIntent(dir, { session: "s2", command: "add", args: "b" }, NOW)).toBe(2);
    dropEntry(dir, 1);
    expect(queueIntent(dir, { session: "s1", command: "add", args: "c" }, NOW)).toBe(3);
  });

  test("two queued intents on one document both land, oldest first, each planned on the newest tip", async () => {
    queueIntent(dir, { session: "s1", command: "add", args: "a" }, NOW);
    queueIntent(dir, { session: "s1", command: "add", args: "b" }, NOW);
    record.landFromAnotherMachine([{ path: LIST, text: '{ "items": ["theirs"] }\n' }]);
    expect(await flushOutbox(record, dir, runners, options)).toEqual({ kind: "flushed", sent: 2, refused: [], pending: 0 });
    expect(listAtTip(record)).toEqual({ items: ["theirs", "a", "b"] });
    expect(listOutbox(dir)).toEqual([]);
  });

  test("a later write flushes the outbox before its own intent", async () => {
    queueIntent(dir, { session: "s1", command: "add", args: "queued" }, NOW);
    expect((await sendIntent(record, dir, { session: "s2", command: "add", args: "now" }, runners, options, NOW)).kind).toBe("landed");
    expect(listAtTip(record)).toEqual({ items: ["queued", "now"] });
  });

  test("a refused intent stays, marked, and is reported only to the session that made it", async () => {
    queueIntent(dir, { session: "s1", command: "close", args: "gone" }, NOW);
    const flushed = await flushOutbox(record, dir, runners, options);
    expect(flushed).toMatchObject({ kind: "flushed", sent: 0, pending: 1, refused: [{ n: 1, session: "s1", refused: "gone was already closed" }] });
    expect(refusedFor(listOutbox(dir), "s1")).toEqual([{ n: 1, session: "s1", command: "close", args: "gone", queuedAt: NOW.toISOString(), refused: "gone was already closed" }]);
    expect(refusedFor(listOutbox(dir), "s2")).toEqual([]);
    expect(await flushOutbox(record, dir, runners, options)).toEqual({ kind: "flushed", sent: 0, refused: [], pending: 1 });
    expect(dropEntry(dir, 1)).toBe(true);
    expect(listOutbox(dir)).toEqual([]);
  });

  test("still offline: the flush stops and keeps everything", async () => {
    queueIntent(dir, { session: "s1", command: "add", args: "a" }, NOW);
    record.offline = true;
    expect(await flushOutbox(record, dir, runners, options)).toEqual({ kind: "offline", pending: 1 });
  });

  test("a flush in progress elsewhere holds the lock; a lock left by a crashed flush is taken", async () => {
    queueIntent(dir, { session: "s1", command: "add", args: "a" }, NOW);
    const lock = join(dir, OUTBOX_LOCK);
    mkdirSync(lock);
    expect(await flushOutbox(record, dir, runners, options)).toEqual({ kind: "busy", pending: 1 });
    const crashed = new Date(Date.now() - 60 * 60_000);
    utimesSync(lock, crashed, crashed);
    expect((await flushOutbox(record, dir, runners, options)).kind).toBe("flushed");
    expect(existsSync(lock)).toBe(false);
  });

  test("an intent this plugin version has no runner for waits for one that has", async () => {
    queueIntent(dir, { session: "s1", command: "from-a-newer-plugin", args: {} }, NOW);
    expect(await flushOutbox(record, dir, runners, options)).toEqual({ kind: "flushed", sent: 0, refused: [], pending: 1 });
    expect(listOutbox(dir)[0]?.refused).toBeUndefined();
  });
});
