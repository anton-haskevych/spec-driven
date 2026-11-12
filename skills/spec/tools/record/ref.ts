import type { Git } from "../core/git";
import type { FileChange, RefPort, Tip, TipRead } from "../core/land-on-ref";
import { leasePush, NETWORK } from "../core/remote-push";
import type { Result } from "../core/result";
import { commitOnto } from "../publish/commit-onto";
import { RECORD_REF, RECORD_TRACKING_REF } from "./layout";

export interface RecordPort extends RefPort {
  blobIdsByPath(tip: string): Result<Map<string, string>>;
  readBlob(version: string): Result<string>;
}

const LS_REMOTE_NO_MATCH = 2;
const REF_LOCKED = /cannot lock ref|unable to create '[^']*\.lock'|unable to update local ref/i;
const REMOVE_PATH = `0 ${"0".repeat(40)}`;

export function gitRecordPort(git: Git): RecordPort | undefined {
  if (!git.out(["remote", "get-url", "origin"]).ok) return undefined;
  return {
    fetchTip: () => fetchRecordTip(git),
    commit: (base, changes, message) => commitChanges(git, base, changes, message),
    push: (commit, lease) => {
      const pushed = leasePush(git, RECORD_REF, lease.kind === "at" ? lease.sha : "", `${commit}:${RECORD_REF}`);
      if (pushed.kind === "pushed") git.run(["update-ref", RECORD_TRACKING_REF, commit]);
      return pushed;
    },
    blobIdsByPath: (tip) => listBlobIds(git, tip),
    readBlob: (version) => {
      const read = git.run(["cat-file", "blob", version]);
      return read.code === 0 ? { ok: true, value: read.stdout } : { ok: false, reason: `can't read record blob ${version}: ${read.stderr.trim()}` };
    },
  };
}

// One round trip when the record exists; ls-remote only after a failed fetch, to tell absent from unreachable.
export function fetchRecordTip(git: Git): TipRead {
  const fetched = git.run(["fetch", "-q", "--no-tags", "origin", `+${RECORD_REF}:${RECORD_TRACKING_REF}`], NETWORK);
  if (fetched.code === 0) {
    const tip = git.out(["rev-parse", "--verify", "-q", RECORD_TRACKING_REF]);
    return tip.ok ? { kind: "at", sha: tip.value } : { kind: "failed", reason: tip.reason };
  }
  if (REF_LOCKED.test(fetched.stderr)) return { kind: "busy", reason: fetched.stderr.trim() };
  const listed = git.run(["ls-remote", "--exit-code", "origin", RECORD_REF], NETWORK);
  if (listed.code === LS_REMOTE_NO_MATCH) {
    git.run(["update-ref", "-d", RECORD_TRACKING_REF]);
    return { kind: "absent" };
  }
  const reason = fetched.stderr.trim() || `git fetch exit ${fetched.code}`;
  return listed.code === 0 ? { kind: "failed", reason } : { kind: "offline", reason };
}

function commitChanges(git: Git, base: Tip, changes: readonly FileChange[], message: string): Result<string> {
  const entries: string[] = [];
  for (const change of changes) {
    if (change.text === undefined) {
      entries.push(`${REMOVE_PATH}\t${change.path}\0`);
      continue;
    }
    const blob = git.out(["hash-object", "-w", "--stdin"], { stdin: change.text });
    if (!blob.ok) return blob;
    entries.push(`100644 blob ${blob.value}\t${change.path}\0`);
  }
  return commitOnto(git, base.kind === "at" ? base.sha : undefined, entries.join(""), message);
}

function listBlobIds(git: Git, tip: string): Result<Map<string, string>> {
  const listed = git.run(["ls-tree", "-r", "-z", tip]);
  if (listed.code !== 0) return { ok: false, reason: `can't list the record at ${tip.slice(0, 7)}: ${listed.stderr.trim()}` };
  const versions = new Map<string, string>();
  for (const entry of listed.stdout.split("\0")) {
    const [meta, path] = entry.split("\t");
    const blob = meta?.split(" ")[2];
    if (path && blob) versions.set(path, blob);
  }
  return { ok: true, value: versions };
}
