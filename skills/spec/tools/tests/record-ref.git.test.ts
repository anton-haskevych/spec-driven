import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitAt, gitCommonDir, stateDirIn } from "../core/git";
import type { FileChange } from "../core/land-on-ref";
import { serializeDoc } from "../record/document";
import { RECORD_REF, RECORD_TRACKING_REF } from "../record/layout";
import { gitRecordReadPort } from "../record/read";
import { gitRecordPort, type RecordPort } from "../record/ref";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { landed, recordPortContract } from "./record-port-contract";
import { recordReadPortContract } from "./record-read-port-contract";

let repo: TestRepo;
let desktop: WorkingCopy;
let plain: WorkingCopy;

beforeAll(() => {
  repo = repoWithOrigin("spec-record-ref-");
  desktop = repo.clone("desktop");
  plain = repo.clone("plain");
});
afterAll(() => repo.cleanup());

const laptopGit = () => gitAt(repo.dir, isolatedRunner);
const trackingLock = () => join(repo.dir, ".git", `${RECORD_TRACKING_REF}.lock`);

function portAt(dir: string): RecordPort {
  const port = gitRecordPort(gitAt(dir, isolatedRunner));
  if (!port) throw new Error("no origin");
  return port;
}

function readAt(dir: string) {
  const read = gitRecordReadPort(gitAt(dir, isolatedRunner));
  if (!read) throw new Error("no origin");
  return read;
}

function fetchedStamp(): string {
  const commonDir = gitCommonDir(laptopGit());
  if (!commonDir.ok) throw new Error(commonDir.reason);
  return stateDirIn(commonDir.value, "record-fetched");
}

// Unchecked: most of what a reset undoes was never set in the case before.
const gitIn = (dir: string, ...args: string[]) => isolatedRunner.run(["git", ...args], { cwd: dir });

function resetRecord(): void {
  gitIn(repo.root, "--git-dir", repo.origin, "update-ref", "-d", RECORD_REF);
  for (const copy of [repo, desktop]) {
    gitIn(copy.dir, "update-ref", "-d", RECORD_TRACKING_REF);
    gitIn(copy.dir, "remote", "set-url", "origin", repo.origin);
    gitIn(copy.dir, "config", "--unset-all", "fetch.negotiationAlgorithm");
  }
  rmSync(trackingLock(), { force: true });
  rmSync(fetchedStamp(), { force: true });
}

function landElsewhere(changes: readonly FileChange[]): string {
  const desktopPort = portAt(desktop.dir);
  const tip = desktopPort.fetchTip();
  if (tip.kind !== "at" && tip.kind !== "absent") throw new Error(`desktop fetch ${tip.kind}`);
  return landed(desktopPort, tip, changes);
}

recordPortContract("gitRecordPort", () => {
  resetRecord();
  return {
    port: portAt(repo.dir),
    landElsewhere,
    goOffline: () => repo.git("remote", "set-url", "origin", join(repo.root, "missing.git")),
    holdLock: () => {
      mkdirSync(join(trackingLock(), ".."), { recursive: true });
      writeFileSync(trackingLock(), "");
    },
    breakFetch: () => repo.git("config", "fetch.negotiationAlgorithm", "bogus"),
  };
});

recordReadPortContract("gitRecordReadPort", () => {
  resetRecord();
  return {
    port: portAt(repo.dir),
    read: readAt(repo.dir),
    newRead: () => readAt(repo.dir),
    landElsewhere,
    deleteOnOrigin: () => repo.git("--git-dir", repo.origin, "update-ref", "-d", RECORD_REF),
  };
});

describe("gitRecordPort adapter", () => {
  test("no origin: no port", () => {
    expect(gitRecordPort(gitAt(repo.root, isolatedRunner))).toBeUndefined();
  });

  test("a commit of many documents writes their blobs in one git call, each at its path", () => {
    resetRecord();
    const calls: string[] = [];
    const counting = gitRecordPort(gitAt(repo.dir, { run: (argv, options) => (calls.push(argv.join(" ")), isolatedRunner.run(argv, options)) }));
    const changes = Array.from({ length: 40 }, (_, index) => ({ path: `cards/0/c${index + 1}.json`, text: serializeDoc({ id: `c${index + 1}` }) }));
    const commit = counting?.commit({ kind: "absent" }, [...changes, { path: "gone.json", text: undefined }], "record: many");
    if (!commit?.ok) throw new Error(commit?.reason ?? "no port");
    expect(calls.filter((call) => call.includes("hash-object")).length).toBe(1);
    expect(repo.git("show", `${commit.value}:cards/0/c7.json`)).toBe(serializeDoc({ id: "c7" }).trimEnd());
    expect(repo.git("ls-tree", "-r", "--name-only", commit.value).split("\n").length).toBe(40);
  });

  test("the record ref is not a branch: a plain fetch doesn't bring it", () => {
    resetRecord();
    landElsewhere([{ path: "a.json", text: "{}\n" }]);
    plain.git("fetch", "-q", "origin");
    expect(plain.git("for-each-ref", "--format=%(refname)", "refs/spec-board-remote", "refs/spec-board")).toBe("");
    expect(repo.git("--git-dir", repo.origin, "for-each-ref", "--format=%(refname)", RECORD_REF)).toBe(RECORD_REF);
  });
});
