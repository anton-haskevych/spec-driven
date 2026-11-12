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
  filesAt(sha: string | undefined): ReadonlyMap<string, string>;
  landFromAnotherMachine(changes: readonly FileChange[], message?: string): string;
}

export function fakeRef(): FakeRef {
  let next = 0;
  const ref: FakeRef = {
    commits: new Map(),
    tip: undefined,
    offline: false,
    busyFetches: 0,
    racerBeforeNextPush: undefined,
    filesAt: (sha) => (sha ? (ref.commits.get(sha)?.files ?? new Map()) : new Map()),
    fetchTip(): TipRead {
      if (ref.offline) return { kind: "offline", reason: "origin unreachable" };
      if (ref.busyFetches > 0) {
        ref.busyFetches -= 1;
        return { kind: "busy", reason: "cannot lock ref" };
      }
      return ref.tip ? { kind: "at", sha: ref.tip } : { kind: "absent" };
    },
    commit(base, changes, message) {
      const files = new Map(ref.filesAt(base.kind === "at" ? base.sha : undefined));
      for (const change of changes) {
        if (change.text === undefined) files.delete(change.path);
        else files.set(change.path, change.text);
      }
      const sha = `c${++next}`;
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
