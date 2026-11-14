import { createHash } from "node:crypto";
import type { FileChange, RefPort, Tip, TipRead } from "../core/land-on-ref";
import type { PushOutcome } from "../core/remote-push";

export interface FakeCommit {
  parent: string | undefined;
  files: ReadonlyMap<string, string>;
  message: string;
}

export interface FakeRef extends RefPort {
  commits: Map<string, FakeCommit>;
  tip: string | undefined;
  offline: boolean;
  busyFetches: number;
  racerBeforeNextPush: (() => void) | undefined;
  // This clone's copy of the tip, as git's tracking ref: a fetch or a push of ours moves it.
  tracking: string | undefined;
  fetches: number;
  failNextFetch(): void;
  filesAt(sha: string | undefined): ReadonlyMap<string, string>;
  landFromAnotherMachine(changes: readonly FileChange[], message?: string): string;
}

export function fakeRef(): FakeRef {
  let next = 0;
  let failing = false;
  const ref: FakeRef = {
    commits: new Map(),
    tip: undefined,
    offline: false,
    busyFetches: 0,
    racerBeforeNextPush: undefined,
    tracking: undefined,
    fetches: 0,
    failNextFetch: () => {
      failing = true;
    },
    filesAt: (sha) => (sha ? (ref.commits.get(sha)?.files ?? new Map()) : new Map()),
    fetchTip(): TipRead {
      ref.fetches += 1;
      if (ref.offline) return { kind: "offline", reason: "origin unreachable" };
      if (ref.busyFetches > 0) {
        ref.busyFetches -= 1;
        return { kind: "busy", reason: "cannot lock ref" };
      }
      // Like git: a failed fetch reads as failed only when origin still lists the ref.
      const failed = failing && ref.tip !== undefined;
      failing = false;
      if (failed) return { kind: "failed", reason: "fatal: fetch failed" };
      ref.tracking = ref.tip;
      return ref.tip ? { kind: "at", sha: ref.tip } : { kind: "absent" };
    },
    commit(base, changes, message) {
      const files = new Map(ref.filesAt(base.kind === "at" ? base.sha : undefined));
      for (const change of changes) {
        if (change.text === undefined) files.delete(change.path);
        else files.set(change.path, change.text);
      }
      const sha = commitId(base, message, ++next);
      ref.commits.set(sha, { parent: base.kind === "at" ? base.sha : undefined, files, message });
      return { ok: true, value: sha };
    },
    push(commit: string, lease: Tip): PushOutcome {
      const racer = ref.racerBeforeNextPush;
      ref.racerBeforeNextPush = undefined;
      racer?.();
      if (ref.offline) return { kind: "offline", reason: "origin unreachable" };
      const expected = lease.kind === "at" ? lease.sha : undefined;
      if (ref.tip !== expected) return { kind: "refused" };
      ref.tip = commit;
      ref.tracking = commit;
      return { kind: "pushed" };
    },
    landFromAnotherMachine(changes, message = "elsewhere") {
      const base: Tip = ref.tip ? { kind: "at", sha: ref.tip } : { kind: "absent" };
      const made = ref.commit(base, changes, message);
      if (!made.ok) throw new Error(made.reason);
      ref.tip = made.value;
      return made.value;
    },
  };
  return ref;
}

// Hex like git's, and per instance, so golden outputs don't depend on which test ran first.
function commitId(base: Tip, message: string, counter: number): string {
  return createHash("sha1").update(`${base.kind === "at" ? base.sha : ""}\0${message}\0${counter}`).digest("hex");
}
