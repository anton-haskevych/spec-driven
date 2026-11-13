import { hostname } from "node:os";
import { basename } from "node:path";
import type { Env } from "../core/env";
import { authorName, type Git } from "../core/git";
import type { RecordPlan } from "../record/write";
import { treeWork } from "../workspaces/changes";
import { claudeSessionRef } from "./session-doc";
import { withStamp, type SessionFacts } from "./stamp";

const UNKNOWN_PERSON = "unknown";

// Gathered from this checkout once per command; git trouble only drops the parts it can't answer.
export function sessionFactsOf(git: Git, env: Env, tree: string, host: string): SessionFacts | undefined {
  const ref = claudeSessionRef(env);
  if (!ref) return undefined;
  const branch = git.out(["branch", "--show-current"]);
  const work = treeWork(git);
  return {
    ref,
    who: authorName(git) ?? UNKNOWN_PERSON,
    host,
    tree,
    ...(branch.ok && branch.value ? { branch: branch.value } : {}),
    ...(work.ok ? { work: work.value } : {}),
  };
}

// The folder name of the tree the command runs in, as claims and the board name it.
export function treeFolder(git: Git, projectDir: string): string {
  const top = git.out(["rev-parse", "--show-toplevel"]);
  return basename(top.ok ? top.value : projectDir);
}

// For a command that writes the record directly: its plan carries this session's stamp.
export function stampedBy(git: Git, env: Env | undefined, projectDir: string, now: Date): (plan: RecordPlan) => RecordPlan {
  if (!env) return (plan) => plan;
  const facts = once(() => sessionFactsOf(git, env, treeFolder(git, projectDir), hostname()));
  return (plan) => withStamp(plan, facts, now);
}

export function once<T>(read: () => T): () => T {
  let value: { read: T } | undefined;
  return () => (value ??= { read: read() }).read;
}
