import { describe, expect, test } from "bun:test";
import { blobVersion, serializeDoc } from "../record/document";
import { MAX_OPS, planWrites, type RecordOp, type Validate } from "../record/plan-writes";
import { viewOf } from "./fake-record";

const PHASE = "specs/alpha/phases/2.json";
const anything: Validate = () => [];
const needsTitle: Validate = (path, doc) => (typeof (doc as { title?: unknown }).title === "string" ? [] : [`${path}: title must be text`]);
const version = (doc: unknown) => blobVersion(serializeDoc(doc));

describe("planWrites", () => {
  const view = viewOf({ [PHASE]: { title: "Join", tasks: ["2.1", "2.2"], due: "2026-12-01" } });

  test("create writes a new document and returns its version", () => {
    const planned = planWrites(view, [{ op: "create", path: "specs/alpha/phases/3.json", doc: { title: "Next" } }], needsTitle);
    expect(planned).toEqual({
      kind: "planned",
      changes: [{ path: "specs/alpha/phases/3.json", text: serializeDoc({ title: "Next" }) }],
      versions: { "specs/alpha/phases/3.json": version({ title: "Next" }) },
    });
  });

  test("create over an existing path conflicts and carries the current document", () => {
    expect(planWrites(view, [{ op: "create", path: PHASE, doc: { title: "Again" } }], anything)).toEqual({
      kind: "conflict",
      path: PHASE,
      current: { title: "Join", tasks: ["2.1", "2.2"], due: "2026-12-01" },
      currentVersion: view.version(PHASE),
    });
  });

  test("update merges a patch: null removes a field, an array is replaced whole", () => {
    const planned = planWrites(view, [{ op: "update", path: PHASE, patch: { due: null, tasks: ["2.1"] } }], needsTitle);
    expect(planned).toMatchObject({ kind: "planned", changes: [{ path: PHASE, text: serializeDoc({ title: "Join", tasks: ["2.1"] }) }] });
  });

  test("a stale ifVersion conflicts with the current document; the current one lands", () => {
    const stale = planWrites(view, [{ op: "update", path: PHASE, patch: { title: "Renamed" }, ifVersion: "0000" }], anything);
    expect(stale).toMatchObject({ kind: "conflict", path: PHASE, currentVersion: view.version(PHASE) });
    const fresh = planWrites(view, [{ op: "update", path: PHASE, patch: { title: "Renamed" }, ifVersion: view.version(PHASE) ?? "" }], anything);
    expect(fresh.kind).toBe("planned");
  });

  test("ifVersion on a document someone deleted conflicts with no current document", () => {
    expect(planWrites(view, [{ op: "replace", path: "specs/alpha/phases/9.json", doc: { title: "x" }, ifVersion: "abc" }], anything)).toEqual({ kind: "conflict", path: "specs/alpha/phases/9.json" });
  });

  test("replace sets the whole document, creating it when missing", () => {
    const planned = planWrites(view, [{ op: "replace", path: PHASE, doc: { title: "Only" } }, { op: "replace", path: "tags/x.json", doc: { title: "X" } }], needsTitle);
    expect(planned).toMatchObject({ kind: "planned", changes: [{ path: PHASE, text: serializeDoc({ title: "Only" }) }, { path: "tags/x.json" }] });
  });

  test("delete removes the path; updating or deleting a missing document is invalid", () => {
    expect(planWrites(view, [{ op: "delete", path: PHASE }], anything)).toEqual({ kind: "planned", changes: [{ path: PHASE, text: undefined }], versions: {} });
    expect(planWrites(view, [{ op: "delete", path: "a/b.json" }, { op: "update", path: "a/c.json", patch: {} }], anything)).toEqual({
      kind: "invalid",
      problems: ["a/b.json does not exist", "a/c.json does not exist"],
    });
  });

  test("every document that fails its validator is reported, and nothing is planned", () => {
    const ops: RecordOp[] = [
      { op: "create", path: "tags/a.json", doc: {} },
      { op: "update", path: PHASE, patch: { title: 3 } },
    ];
    expect(planWrites(view, ops, needsTitle)).toEqual({ kind: "invalid", problems: ["tags/a.json: title must be text", `${PHASE}: title must be text`] });
  });

  test("a path used twice, more than the op limit, a bad path or meta.json is invalid", () => {
    const twice: RecordOp[] = [{ op: "delete", path: PHASE }, { op: "update", path: PHASE, patch: {} }];
    expect(planWrites(view, twice, anything)).toEqual({ kind: "invalid", problems: [`${PHASE} appears twice in one write`] });
    const many: RecordOp[] = Array.from({ length: MAX_OPS + 1 }, (_, index) => ({ op: "create", path: `t/${index}.json`, doc: { title: "t" } }));
    expect(planWrites(view, many, anything)).toEqual({ kind: "invalid", problems: [`one write takes at most ${MAX_OPS} changes; got ${MAX_OPS + 1}`] });
    for (const path of ["../x.json", "a//b.json", "a/b.txt", ".hidden.json", "meta.json"]) {
      expect(planWrites(view, [{ op: "create", path, doc: {} }], anything)).toMatchObject({ kind: "invalid" });
    }
  });

  test("an op that leaves a document as it was writes nothing", () => {
    expect(planWrites(view, [{ op: "update", path: PHASE, patch: { title: "Join" } }], anything)).toEqual({ kind: "planned", changes: [], versions: {} });
  });
});
