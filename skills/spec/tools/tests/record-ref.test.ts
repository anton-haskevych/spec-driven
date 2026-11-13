import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAt } from "../core/git";
import { serializeDoc } from "../record/document";
import { RECORD_REF, RECORD_TRACKING_REF } from "../record/layout";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { openRecordView } from "../record/view";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";

const PHASE = "specs/alpha/phases/1.json";

describe("gitRecordPort (real git, two clones)", () => {
  let repo: TestRepo;
  let laptop: RecordPort;
  let desktop: RecordPort;
  let desktopCopy: WorkingCopy;

  beforeEach(() => {
    repo = repoWithOrigin("spec-record-ref-");
    desktopCopy = repo.clone("desktop");
    laptop = portAt(repo.dir);
    desktop = portAt(desktopCopy.dir);
  });
  afterEach(() => repo.cleanup());

  test("no origin: no port", () => {
    repo.git("remote", "remove", "origin");
    expect(gitRecordPort(gitAt(repo.dir, isolatedRunner))).toBeUndefined();
  });

  test("a commit of many documents writes their blobs in one git call, each at its path", () => {
    const calls: string[] = [];
    const counting = gitRecordPort(gitAt(repo.dir, { run: (argv, options) => (calls.push(argv.join(" ")), isolatedRunner.run(argv, options)) }));
    const changes = Array.from({ length: 40 }, (_, index) => ({ path: `cards/0/c${index + 1}.json`, text: serializeDoc({ id: `c${index + 1}` }) }));
    const commit = counting?.commit({ kind: "absent" }, [...changes, { path: "gone.json", text: undefined }], "record: many");
    if (!commit?.ok) throw new Error(commit?.reason ?? "no port");
    expect(calls.filter((call) => call.includes("hash-object")).length).toBe(1);
    expect(repo.git("show", `${commit.value}:cards/0/c7.json`)).toBe(serializeDoc({ id: "c7" }).trimEnd());
    expect(repo.git("ls-tree", "-r", "--name-only", commit.value).split("\n").length).toBe(40);
  });

  test("a record that doesn't exist yet is absent, not offline", () => {
    expect(laptop.fetchTip()).toEqual({ kind: "absent" });
  });

  test("a first commit pushed on an absent lease is fetched by the other clone, with versions and text", () => {
    const commit = laptop.commit({ kind: "absent" }, [{ path: PHASE, text: serializeDoc({ title: "One" }) }], "record: first");
    if (!commit.ok) throw new Error(commit.reason);
    expect(laptop.push(commit.value, { kind: "absent" })).toEqual({ kind: "pushed" });
    expect(repo.git("rev-parse", RECORD_TRACKING_REF)).toBe(commit.value);

    expect(desktop.fetchTip()).toEqual({ kind: "at", sha: commit.value });
    expect(desktopCopy.git("rev-parse", RECORD_TRACKING_REF)).toBe(commit.value);
    const view = openRecordView(desktop, { kind: "at", sha: commit.value });
    if (!view.ok) throw new Error(view.reason);
    expect(view.value.paths()).toEqual([PHASE]);
    expect(view.value.version(PHASE)).toBe(repo.git("rev-parse", `${commit.value}:${PHASE}`));
    expect(view.value.doc(PHASE)).toEqual({ title: "One" });
    expect(view.value.doc("specs/none.json")).toBeUndefined();
  });

  test("a second create-only push is refused; a lease on the tip lands, and deletes remove paths", () => {
    const first = landed(laptop, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
    const rival = laptop.commit({ kind: "absent" }, [{ path: "x.json", text: "{}\n" }], "rival");
    if (!rival.ok) throw new Error(rival.reason);
    expect(desktop.push(rival.value, { kind: "absent" })).toEqual({ kind: "refused" });

    const tip = desktop.fetchTip();
    expect(tip).toEqual({ kind: "at", sha: first });
    const second = landed(desktop, { kind: "at", sha: first }, [{ path: PHASE, text: undefined }, { path: "y.json", text: "{}\n" }]);
    expect(repo.git("--git-dir", repo.origin, "ls-tree", "-r", "--name-only", second)).toBe("y.json");
  });

  test("an unreachable origin is offline", () => {
    desktopCopy.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    expect(desktop.fetchTip().kind).toBe("offline");
  });

  test("a held lock on the tracking ref is busy", () => {
    landed(laptop, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
    const lock = join(desktopCopy.dir, ".git", `${RECORD_TRACKING_REF}.lock`);
    mkdirSync(join(lock, ".."), { recursive: true });
    writeFileSync(lock, "");
    expect(desktop.fetchTip().kind).toBe("busy");
  });

  test("the record ref is not a branch: a plain clone doesn't fetch it", () => {
    landed(laptop, { kind: "absent" }, [{ path: PHASE, text: "{}\n" }]);
    const fresh = repo.clone("fresh");
    expect(fresh.git("for-each-ref", "--format=%(refname)", "refs/spec-board-remote", "refs/spec-board")).toBe("");
    expect(repo.git("--git-dir", repo.origin, "for-each-ref", "--format=%(refname)", RECORD_REF)).toBe(RECORD_REF);
  });
});

function portAt(dir: string): RecordPort {
  const port = gitRecordPort(gitAt(dir, isolatedRunner));
  if (!port) throw new Error("no origin");
  return port;
}

function landed(port: RecordPort, base: Parameters<RecordPort["commit"]>[0], changes: Parameters<RecordPort["commit"]>[1]): string {
  const commit = port.commit(base, changes, "record: test");
  if (!commit.ok) throw new Error(commit.reason);
  const pushed = port.push(commit.value, base);
  if (pushed.kind !== "pushed") throw new Error(`push ${pushed.kind}`);
  return commit.value;
}
