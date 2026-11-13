import { describe, expect, test } from "bun:test";
import { parseDoc, serializeDoc } from "../record/document";
import { META_PATH, RECORD_LAYOUT } from "../record/layout";
import type { Validate } from "../record/plan-writes";
import type { RecordView } from "../record/view";
import { OLDER_PLUGIN, writeRecord, type RecordPlan } from "../record/write";
import { fakeRecord, type FakeRecord } from "./fake-record";

const LIST = "specs/alpha/list.json";
const anything: Validate = () => [];
const options = { validate: anything, pause: async () => {} };

const itemsIn = (view: RecordView): string[] => ((view.doc(LIST) as { items?: string[] } | undefined)?.items ?? []);

function addItem(item: string): RecordPlan {
  return (view) => {
    const items = itemsIn(view);
    if (items.includes(item)) return { unchanged: true };
    return { ops: [{ op: "replace", path: LIST, doc: { items: [...items, item] } }], message: `record: add ${item}` };
  };
}

const docAtTip = (record: FakeRecord, path: string) => parseDoc(record.filesAt(record.tip).get(path) ?? "");

describe("writeRecord", () => {
  test("the first write creates the ref from an empty tree, with the layout in meta.json", async () => {
    const record = fakeRecord();
    const written = await writeRecord(record, addItem("a"), options);
    expect(written).toMatchObject({ kind: "landed", tip: record.tip });
    expect(record.commits.get(record.tip ?? "")?.parent).toBeUndefined();
    expect(docAtTip(record, META_PATH)).toEqual({ layout: RECORD_LAYOUT });
    expect(docAtTip(record, LIST)).toEqual({ items: ["a"] });
    expect(record.commits.get(record.tip ?? "")?.message).toBe("record: add a");
  });

  test("maxOps lets one write carry more than the usual op limit", async () => {
    const record = fakeRecord();
    const many: RecordPlan = () => ({ ops: Array.from({ length: 60 }, (_, index) => ({ op: "create" as const, path: `t/${index}.json`, doc: {} })) });
    expect((await writeRecord(record, many, options)).kind).toBe("invalid");
    expect((await writeRecord(record, many, { ...options, maxOps: 60 })).kind).toBe("landed");
    expect(record.filesAt(record.tip).size).toBe(61);
  });

  test("the plan runs again on the tip another writer pushed in between", async () => {
    const record = fakeRecord();
    await writeRecord(record, addItem("a"), options);
    record.racerBeforeNextPush = () => record.landFromAnotherMachine([{ path: LIST, text: serializeDoc({ items: ["a", "theirs"] }) }]);
    expect((await writeRecord(record, addItem("mine"), options)).kind).toBe("landed");
    expect(docAtTip(record, LIST)).toEqual({ items: ["a", "theirs", "mine"] });
  });

  test("a plan that refuses, or has nothing to change, writes nothing", async () => {
    const record = fakeRecord();
    await writeRecord(record, addItem("a"), options);
    const tip = record.tip;
    expect(await writeRecord(record, () => ({ refused: "a was closed 4 min ago" }), options)).toEqual({ kind: "refused", reason: "a was closed 4 min ago" });
    expect(await writeRecord(record, addItem("a"), options)).toEqual({ kind: "unchanged" });
    expect(await writeRecord(record, () => ({ ops: [{ op: "replace", path: LIST, doc: { items: ["a"] } }] }), options)).toEqual({ kind: "unchanged" });
    expect(record.tip).toBe(tip);
  });

  test("a conflict or an invalid batch comes back as it is, and writes nothing", async () => {
    const record = fakeRecord();
    await writeRecord(record, addItem("a"), options);
    expect(await writeRecord(record, () => ({ ops: [{ op: "create", path: LIST, doc: {} }] }), options)).toMatchObject({ kind: "conflict", path: LIST, current: { items: ["a"] } });
    const strict: Validate = () => ["items must be sorted"];
    expect(await writeRecord(record, addItem("b"), { ...options, validate: strict })).toEqual({ kind: "invalid", problems: ["items must be sorted"] });
  });

  test("a record written by a newer layout refuses every write", async () => {
    const record = fakeRecord();
    record.landFromAnotherMachine([{ path: META_PATH, text: serializeDoc({ layout: RECORD_LAYOUT + 1 }) }]);
    expect(await writeRecord(record, addItem("a"), options)).toEqual({ kind: "refused", reason: OLDER_PLUGIN });
  });

  // A PR B plugin (layout 1) reads this meta.json as newer and refuses, by the rule the test above pins.
  test("the first write to an older layout's record raises meta.json to this plugin's layout", async () => {
    const record = fakeRecord();
    record.landFromAnotherMachine([{ path: META_PATH, text: serializeDoc({ layout: RECORD_LAYOUT - 1 }) }]);
    expect((await writeRecord(record, addItem("a"), options)).kind).toBe("landed");
    expect(docAtTip(record, META_PATH)).toEqual({ layout: RECORD_LAYOUT });
  });

  test("an unreachable origin comes back offline for the outbox to queue", async () => {
    const record = fakeRecord();
    record.offline = true;
    expect((await writeRecord(record, addItem("a"), options)).kind).toBe("offline");
  });

  test("a plan's alongside ops land in the same commit", async () => {
    const record = fakeRecord();
    const plan: RecordPlan = () => ({ ops: [{ op: "replace", path: LIST, doc: { items: ["a"] } }], alongside: [{ op: "replace", path: "sessions/s1.json", doc: { at: 1 } }] });
    expect((await writeRecord(record, plan, options)).kind).toBe("landed");
    expect(docAtTip(record, "sessions/s1.json")).toEqual({ at: 1 });
    expect(record.commits.size).toBe(1);
  });
});
