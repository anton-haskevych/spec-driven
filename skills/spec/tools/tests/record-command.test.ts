import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { recordCommand, type RecordDeps } from "../commands/record";
import { gitAt, gitCommonDir } from "../core/git";
import { outboxDir, queueIntent } from "../record/outbox";
import { gitRecordPort } from "../record/ref";
import { writeRecord } from "../record/write";
import type { LocalPilot } from "../runtime/workflow-capabilities";
import { run } from "../spec";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const LIST = "specs/alpha/list.json";
const NOW = new Date("2026-11-11T20:00:00Z");

describe("spec.ts record (real git)", () => {
  let repo: TestRepo;
  let deps: RecordDeps;
  let outbox: string;

  beforeEach(() => {
    repo = repoWithOrigin("spec-record-command-");
    deps = {
      runner: isolatedRunner,
      env: { CLAUDE_CODE_SESSION_ID: "s1" },
      now: () => new Date(),
      runners: { refuse: (args) => () => ({ refused: `${String(args)} was already closed` }), add: (args) => () => ({ ops: [{ op: "replace", path: LIST, doc: { items: [args] } }] }) },
      validate: () => [],
    };
    const common = gitCommonDir(gitAt(repo.dir, isolatedRunner));
    if (!common.ok) throw new Error(common.reason);
    outbox = outboxDir(common.value);
  });
  afterEach(() => repo.cleanup());

  const record = (...args: string[]) => recordCommand(repo.dir, args, deps);
  const landFromHere = async () => {
    const port = gitRecordPort(gitAt(repo.dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    const written = await writeRecord(port, () => ({ ops: [{ op: "replace", path: LIST, doc: { items: [] } }] }), { validate: () => [] });
    if (written.kind !== "landed") throw new Error(written.kind);
    return written.tip.slice(0, 7);
  };

  test("status before anything was fetched", async () => {
    expect(await record("status")).toBe("record: no record fetched yet · no local copy · nothing queued");
  });

  test("sync with no record on origin says so", async () => {
    expect(await record("sync")).toBe("record: no record on origin yet · nothing queued");
  });

  test("sync fetches the tip and refreshes the local copy; status then reads them without a fetch", async () => {
    const tip = await landFromHere();
    expect(await record("sync")).toBe(`record: synced ${tip} · local copy refreshed · nothing queued`);
    expect(await record("status")).toBe(`record: tip ${tip} · local copy from <1m ago · nothing queued`);
  });

  test("sync sends queued intents and reports this session's refusals with the way out", async () => {
    await landFromHere();
    queueIntent(outbox, { session: "s1", command: "add", args: "a" }, NOW);
    queueIntent(outbox, { session: "s1", command: "refuse", args: "2.3" }, NOW);
    queueIntent(outbox, { session: "s2", command: "refuse", args: "4.1" }, NOW);
    const synced = await record("sync");
    expect(synced).toContain("· sent 1 · 2 changes not shared yet · #2 refused: 2.3 was already closed (record drop 2)");
    expect(synced).not.toContain("4.1");
    expect(await record("drop", "2")).toBe("record: dropped #2");
    expect(await record("drop", "2")).toBe("record: no queued change #2");
  });

  test("offline: sync keeps everything and names the local copy's age", async () => {
    await landFromHere();
    await record("sync");
    queueIntent(outbox, { session: "s1", command: "add", args: "a" }, NOW);
    repo.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    expect(await record("sync")).toBe("record: origin unreachable; local copy from <1m ago · 1 change not shared yet");
  });

  test("usage, and refused under a Codex local pilot", async () => {
    expect(await record("drop", "x")).toBe("usage: record status | sync | drop <n>");
    expect(await record()).toBe("usage: record status | sync | drop <n>");
    const pilot: LocalPilot = { kind: "local-pilot", spec: "alpha", phase: "1" };
    expect(await run(["record", "status"], repo.dir, { workflow: pilot })).toContain("record unavailable in local-pilot");
  });
});
