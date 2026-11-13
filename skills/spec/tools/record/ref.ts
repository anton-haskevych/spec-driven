import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Git } from "../core/git";
import type { FileChange, RefPort, Tip, TipRead } from "../core/land-on-ref";
import { leasePush, NETWORK, REMOTE_TIMEOUT_MS } from "../core/remote-push";
import { ranOutOfTime } from "../core/run";
import type { Result } from "../core/result";
import { commitOnto } from "../publish/commit-onto";
import { RECORD_REF, RECORD_TRACKING_REF } from "./layout";

export interface RecordPort extends RefPort {
  blobIdsByPath(tip: string): Result<Map<string, string>>;
  readBlob(version: string): Result<string>;
  readBlobs(versions: readonly string[]): Result<Map<string, string>>;
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
    readBlobs: (versions) => readBlobBatch(git, versions),
  };
}

// One round trip when the record exists; ls-remote only after a failed fetch, to tell absent from unreachable.
// A fetch that ran out of time already answered that: asking again would wait out a second limit.
export function fetchRecordTip(git: Git, timeoutMs = REMOTE_TIMEOUT_MS): TipRead {
  const network = { ...NETWORK, timeoutMs };
  const fetched = git.run(["fetch", "-q", "--no-tags", "origin", `+${RECORD_REF}:${RECORD_TRACKING_REF}`], network);
  if (fetched.code === 0) {
    const tip = git.out(["rev-parse", "--verify", "-q", RECORD_TRACKING_REF]);
    return tip.ok ? { kind: "at", sha: tip.value } : { kind: "failed", reason: tip.reason };
  }
  if (ranOutOfTime(fetched)) return { kind: "offline", reason: fetched.stderr };
  if (REF_LOCKED.test(fetched.stderr)) return { kind: "busy", reason: fetched.stderr.trim() };
  const listed = git.run(["ls-remote", "--exit-code", "origin", RECORD_REF], network);
  if (listed.code === LS_REMOTE_NO_MATCH) {
    git.run(["update-ref", "-d", RECORD_TRACKING_REF]);
    return { kind: "absent" };
  }
  const reason = fetched.stderr.trim() || `git fetch exit ${fetched.code}`;
  return listed.code === 0 ? { kind: "failed", reason } : { kind: "offline", reason };
}

function commitChanges(git: Git, base: Tip, changes: readonly FileChange[], message: string): Result<string> {
  const written = changes.flatMap((change) => (change.text === undefined ? [] : [change.text]));
  const blobs = writeBlobs(git, written);
  if (!blobs.ok) return blobs;
  let next = 0;
  const entries = changes.map((change) => (change.text === undefined ? `${REMOVE_PATH}\t${change.path}\0` : `100644 blob ${blobs.value[next++]}\t${change.path}\0`));
  return commitOnto(git, base.kind === "at" ? base.sha : undefined, entries.join(""), message);
}

// One git call for every blob: a board loaded from a file writes hundreds, and a spawn each took seconds.
function writeBlobs(git: Git, texts: readonly string[]): Result<string[]> {
  if (texts.length === 0) return { ok: true, value: [] };
  const dir = mkdtempSync(join(tmpdir(), "spec-record-blobs-"));
  try {
    const paths = texts.map((text, index) => {
      const path = join(dir, String(index));
      writeFileSync(path, text);
      return path;
    });
    const hashed = git.out(["hash-object", "-w", "--stdin-paths"], { stdin: `${paths.join("\n")}\n` });
    if (!hashed.ok) return hashed;
    const ids = hashed.value.split("\n").filter(Boolean);
    return ids.length === texts.length ? { ok: true, value: ids } : { ok: false, reason: `git hash-object wrote ${ids.length} of ${texts.length} blobs` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

// One spawn for every document: `<id> blob <bytes>\n<content>\n` per blob, sizes in bytes, not characters.
function readBlobBatch(git: Git, versions: readonly string[]): Result<Map<string, string>> {
  const texts = new Map<string, string>();
  if (versions.length === 0) return { ok: true, value: texts };
  const read = git.run(["cat-file", "--batch"], { stdin: `${versions.join("\n")}\n` });
  if (read.code !== 0) return { ok: false, reason: `can't read the record's documents: ${read.stderr.trim()}` };
  const bytes = Buffer.from(read.stdout, "utf8");
  let at = 0;
  for (const version of versions) {
    const headerEnd = bytes.indexOf(0x0a, at);
    const [id, type, size] = bytes.subarray(at, headerEnd).toString("utf8").split(" ");
    if (id !== version || type !== "blob" || size === undefined) return { ok: false, reason: `record blob ${version} is missing` };
    const start = headerEnd + 1;
    const end = start + Number(size);
    texts.set(version, bytes.subarray(start, end).toString("utf8"));
    at = end + 1;
  }
  return { ok: true, value: texts };
}
