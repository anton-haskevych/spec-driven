import type { PushOutcome } from "./remote-push";
import type { Result } from "./result";

export type Tip = { kind: "absent" } | { kind: "at"; sha: string };

// Callers queue only on `offline`; `busy` (a ref lock held right now) is retried here.
export type TipRead = Tip | { kind: "offline"; reason: string } | { kind: "busy"; reason: string } | { kind: "failed"; reason: string };

export interface FileChange {
  path: string;
  text: string | undefined;
}

// `failed`: origin turned the push down for a reason a retry can't change.
export type RefPush = PushOutcome | { kind: "failed"; reason: string };

export interface RefPort {
  fetchTip(): TipRead;
  commit(base: Tip, changes: readonly FileChange[], message: string): Result<string>;
  push(commit: string, lease: Tip): RefPush;
}

export type RefEdit<T, S> = { kind: "commit"; changes: readonly FileChange[]; message: string; landed: T } | { kind: "stop"; outcome: S };

export type RefLanding<T, S> =
  | { kind: "landed"; sha: string; landed: T }
  | { kind: "stopped"; outcome: S }
  | { kind: "offline"; reason: string }
  | { kind: "failed"; reason: string };

export interface LandOptions {
  name: string;
  attempts?: number;
  pause?: (ms: number) => Promise<void>;
}

type Attempt<T, S> = RefLanding<T, S> | { kind: "retry" };

export const LAND_ATTEMPTS = 5;
const BUSY_PAUSE_MS = 250;

export async function landOnRef<T, S>(port: RefPort, plan: (tip: Tip) => RefEdit<T, S> | Promise<RefEdit<T, S>>, options: LandOptions): Promise<RefLanding<T, S>> {
  const attempts = options.attempts ?? LAND_ATTEMPTS;
  const pause = options.pause ?? ((ms: number) => Bun.sleep(ms));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const outcome = await landAttempt(port, plan);
    if (outcome.kind !== "retry") return outcome;
    await pause(BUSY_PAUSE_MS * (attempt + 1));
  }
  return { kind: "failed", reason: `${options.name} moved ${attempts} times while writing; nothing written — run it again` };
}

async function landAttempt<T, S>(port: RefPort, plan: (tip: Tip) => RefEdit<T, S> | Promise<RefEdit<T, S>>): Promise<Attempt<T, S>> {
  const tip = port.fetchTip();
  if (tip.kind === "busy") return { kind: "retry" };
  if (tip.kind === "offline" || tip.kind === "failed") return tip;

  const edit = await plan(tip);
  if (edit.kind === "stop") return { kind: "stopped", outcome: edit.outcome };

  const commit = port.commit(tip, edit.changes, edit.message);
  if (!commit.ok) return { kind: "failed", reason: commit.reason };
  const pushed = port.push(commit.value, tip);
  if (pushed.kind === "refused") return { kind: "retry" };
  if (pushed.kind === "offline" || pushed.kind === "failed") return pushed;
  return { kind: "landed", sha: commit.value, landed: edit.landed };
}
