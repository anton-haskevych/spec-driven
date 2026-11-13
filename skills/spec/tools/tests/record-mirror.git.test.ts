import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, readdirSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { gitAt, gitCommonDir, type Git } from "../core/git";
import { RECORD_LAYOUT } from "../record/layout";
import { readRecordCopy, recordCopyRoot, refreshRecordCopy } from "../record/mirror";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { writeRecord } from "../record/write";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const LIST = "specs/alpha/list.json";

describe("the record's local copy (real git)", () => {
  let repo: TestRepo;
  let git: Git;
  let port: RecordPort;
  let commonDir: string;

  beforeEach(() => {
    repo = repoWithOrigin("spec-record-mirror-");
    git = gitAt(repo.dir, isolatedRunner);
    const made = gitRecordPort(git);
    const common = gitCommonDir(git);
    if (!made || !common.ok) throw new Error("setup");
    port = made;
    commonDir = common.value;
  });
  afterEach(() => repo.cleanup());

  const write = async (value: string): Promise<string> => {
    const written = await writeRecord(port, () => ({ ops: [{ op: "replace", path: LIST, doc: { value } }] }), { validate: () => [] });
    if (written.kind !== "landed") throw new Error(written.kind);
    return written.tip;
  };

  test("one folder per tip, named <tip>.<layout>, holding the record's files", async () => {
    const tip = await write("one");
    const refreshed = await refreshRecordCopy(git, commonDir, tip);
    expect(refreshed).toEqual({ ok: true, value: join(recordCopyRoot(commonDir), `${tip}.${RECORD_LAYOUT}`) });
    expect(JSON.parse(readFileSync(join(refreshed.ok ? refreshed.value : "", LIST), "utf8"))).toEqual({ value: "one" });
    expect(readRecordCopy(commonDir, new Date())).toMatchObject({ tip, dir: refreshed.ok ? refreshed.value : "" });
  });

  test("two copies are kept; the newest is the one read", async () => {
    const tips = [await write("one"), await write("two"), await write("three")];
    for (const tip of tips) await refreshRecordCopy(git, commonDir, tip);
    expect(readdirSync(recordCopyRoot(commonDir)).toSorted()).toEqual(tips.slice(1).map((tip) => `${tip}.${RECORD_LAYOUT}`).toSorted());
    expect(readRecordCopy(commonDir, new Date())?.tip).toBe(tips[2]);
  });

  test("a reader during a refresh sees the last whole copy, never the half-extracted one", async () => {
    const tip = await write("one");
    await refreshRecordCopy(git, commonDir, tip);
    mkdirSync(join(recordCopyRoot(commonDir), ".tmp-refreshing"));
    expect(readRecordCopy(commonDir, new Date())?.tip).toBe(tip);
  });

  test("its age is the time since a fetch last confirmed it; a refresh of the same tip renews it", async () => {
    const tip = await write("one");
    const refreshed = await refreshRecordCopy(git, commonDir, tip);
    if (!refreshed.ok) throw new Error(refreshed.reason);
    const longAgo = new Date(Date.now() - 14 * 60_000);
    utimesSync(refreshed.value, longAgo, longAgo);
    expect(readRecordCopy(commonDir, new Date())?.ageMs).toBeGreaterThanOrEqual(14 * 60_000);
    await refreshRecordCopy(git, commonDir, tip);
    expect(readRecordCopy(commonDir, new Date())?.ageMs).toBeLessThan(60_000);
  });

  test("no copy yet reads as none", () => {
    expect(readRecordCopy(commonDir, new Date())).toBeUndefined();
  });
});
