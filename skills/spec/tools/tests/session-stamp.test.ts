import { describe, expect, test } from "bun:test";
import { parseDoc } from "../record/document";
import { writeRecord, type RecordPlan } from "../record/write";
import { validateRecordDoc } from "../plan/kinds";
import { CLAUDE_CODE_SOURCE, sessionDocPath } from "../sessions/session-doc";
import { stampSession, withStamp, type SessionFacts } from "../sessions/stamp";
import { fakeRecord, viewOf } from "./fake-record";
import { sessionDoc, specDoc } from "./record-factories";

const NOW = new Date("2026-11-13T18:00:00Z");
const facts = (id: string, overrides: Partial<SessionFacts> = {}): SessionFacts => ({
  ref: { source: CLAUDE_CODE_SOURCE, id },
  who: "Anton",
  host: "mbp",
  tree: "checkout-pr-a",
  ...overrides,
});
// Sessions are checked by the real reader; the other documents here are free-form.
const validate = (path: string, doc: unknown): string[] => (path.startsWith("sessions/") ? validateRecordDoc(path, doc) : []);
const options = { validate, pause: async () => {} };

describe("stampSession", () => {
  test("a first stamp is an execute session with who, host, tree and the time", () => {
    const [op] = stampSession(viewOf({}), facts("s1", { branch: "feat/checkout-pr-a" }), NOW);
    expect(op).toMatchObject({ op: "replace", path: sessionDocPath(facts("s1").ref) });
    expect(op?.op === "replace" && op.doc).toEqual({
      ref: facts("s1").ref,
      who: "Anton",
      host: "mbp",
      tree: "checkout-pr-a",
      mode: "execute",
      branch: "feat/checkout-pr-a",
      lastWriteAt: expect.stringMatching(/^2026-11-1[34]T/),
    });
  });

  test("a replace with no ifVersion: the last writer wins", () => {
    const [op] = stampSession(viewOf({}), facts("s1"), NOW);
    expect(op && "ifVersion" in op).toBe(false);
  });

  test("mode, spec and title registered earlier are carried; the plan version is the spec's now", () => {
    const earlier = sessionDoc({ ref: facts("s1").ref, mode: "review", spec: "checkout", title: "review checkout", lastWriteAt: "2026-11-13T08:00:00-08:00" });
    const view = viewOf({ [sessionDocPath(earlier.ref)]: earlier, "specs/checkout/spec.json": specDoc({ planVersion: 9 }) });
    const [op] = stampSession(view, facts("s1"), NOW);
    expect(op?.op === "replace" && op.doc).toMatchObject({ mode: "review", spec: "checkout", title: "review checkout", planVersion: 9 });
  });

  test("a spec the record doesn't hold leaves the plan version off", () => {
    const earlier = sessionDoc({ ref: facts("s1").ref, spec: "elsewhere" });
    const [op] = stampSession(viewOf({ [sessionDocPath(earlier.ref)]: earlier }), facts("s1"), NOW);
    expect(op?.op === "replace" && "planVersion" in (op.doc as object)).toBe(false);
  });

  test("an unreadable earlier document is written over, not trusted", () => {
    const [op] = stampSession(viewOf({ [sessionDocPath(facts("s1").ref)]: { mode: 3 } }), facts("s1"), NOW);
    expect(op?.op === "replace" && op.doc).toMatchObject({ mode: "execute" });
  });

  test("registration sets the mode, spec and title, and a later stamp keeps them", () => {
    const registered = stampSession(viewOf({}), facts("s1"), NOW, { mode: "prep", spec: "checkout", title: "prep checkout" })[0];
    const doc = registered?.op === "replace" ? registered.doc : undefined;
    expect(doc).toMatchObject({ mode: "prep", spec: "checkout", title: "prep checkout" });
    const [later] = stampSession(viewOf({ [sessionDocPath(facts("s1").ref)]: doc }), facts("s1"), NOW);
    expect(later?.op === "replace" && later.doc).toMatchObject({ mode: "prep", spec: "checkout", title: "prep checkout" });
  });

  test("what the tree holds is stamped when known and left off when not", () => {
    const known = stampSession(viewOf({}), facts("s1", { work: { ahead: 3, edited: 5 } }), NOW)[0];
    expect(known?.op === "replace" && known.doc).toMatchObject({ ahead: 3, edited: 5 });
    const noRemote = stampSession(viewOf({}), facts("s1", { work: { edited: 1 } }), NOW)[0];
    expect(noRemote?.op === "replace" && "ahead" in (noRemote.doc as object)).toBe(false);
    expect(noRemote?.op === "replace" && noRemote.doc).toMatchObject({ edited: 1 });
  });
});

const setItem = (path: string, value: string): RecordPlan => () => ({ ops: [{ op: "replace", path, doc: { value } }] });
const docAt = (record: ReturnType<typeof fakeRecord>, path: string) => parseDoc(record.filesAt(record.tip).get(path) ?? "");

describe("withStamp", () => {
  test("the stamp lands in the same commit as the plan's own change", async () => {
    const record = fakeRecord();
    const plan = withStamp(setItem("tags/a.json", "x"), () => facts("s1"), NOW);
    expect((await writeRecord(record, plan, options)).kind).toBe("landed");
    expect(record.commits.size).toBe(1);
    expect(docAt(record, sessionDocPath(facts("s1").ref))).toMatchObject({ who: "Anton", mode: "execute" });
  });

  test("two sessions leave two documents; two sub-agents of one session both land and share one", async () => {
    const record = fakeRecord();
    const write = (id: string, path: string) => writeRecord(record, withStamp(setItem(path, id), () => facts(id), NOW), options);
    await write("s1", "tags/a.json");
    await write("s2", "tags/b.json");
    record.racerBeforeNextPush = () => record.landFromAnotherMachine([{ path: sessionDocPath(facts("s1").ref), text: JSON.stringify({ ...sessionDoc(), who: "Taras" }) }]);
    const results = [await write("s1", "tags/c.json"), await write("s1", "tags/d.json")];
    expect(results.map((result) => result.kind)).toEqual(["landed", "landed"]);
    const stamps = [...record.filesAt(record.tip).keys()].filter((path) => path.startsWith("sessions/"));
    expect(stamps).toHaveLength(2);
    expect(docAt(record, sessionDocPath(facts("s1").ref))).toMatchObject({ who: "Anton" });
  });

  test("a session that never registered is placed on the one spec its write touched", async () => {
    const record = fakeRecord();
    await writeRecord(record, withStamp(setItem("specs/checkout/phases/2.json", "x"), () => facts("s1"), NOW), options);
    expect(docAt(record, sessionDocPath(facts("s1").ref))).toMatchObject({ spec: "checkout" });
    await writeRecord(record, withStamp(setItem("cards/0/c1.json", "x"), () => facts("s1"), NOW), options);
    expect(docAt(record, sessionDocPath(facts("s1").ref))).toMatchObject({ spec: "checkout" });
  });

  test("a write touching two specs places the session on neither", async () => {
    const record = fakeRecord();
    const two: RecordPlan = () => ({ ops: [{ op: "replace", path: "specs/a/phases/1.json", doc: {} }, { op: "replace", path: "specs/b/phases/1.json", doc: {} }] });
    await writeRecord(record, withStamp(two, () => facts("s1"), NOW), options);
    expect(docAt(record, sessionDocPath(facts("s1").ref))).not.toHaveProperty("spec");
  });

  test("a plan that changes nothing or refuses leaves no heartbeat", async () => {
    const record = fakeRecord();
    await writeRecord(record, withStamp(setItem("tags/a.json", "x"), () => facts("s1"), NOW), options);
    const tip = record.tip;
    expect(await writeRecord(record, withStamp(() => ({ unchanged: true }), () => facts("s1"), NOW), options)).toEqual({ kind: "unchanged" });
    expect((await writeRecord(record, withStamp(() => ({ refused: "no" }), () => facts("s1"), NOW), options)).kind).toBe("refused");
    expect(record.tip).toBe(tip);
  });

  test("a session with no identity writes the plan alone", async () => {
    const record = fakeRecord();
    await writeRecord(record, withStamp(setItem("tags/a.json", "x"), () => undefined, NOW), options);
    expect([...record.filesAt(record.tip).keys()].some((path) => path.startsWith("sessions/"))).toBe(false);
  });

  test("the plan's own alongside ops are kept", async () => {
    const record = fakeRecord();
    const own: RecordPlan = () => ({ ops: [{ op: "replace", path: "tags/a.json", doc: { value: "x" } }], alongside: [{ op: "replace", path: "tags/z.json", doc: { value: "z" } }] });
    await writeRecord(record, withStamp(own, () => facts("s1"), NOW), options);
    expect(docAt(record, "tags/z.json")).toEqual({ value: "z" });
  });
});
