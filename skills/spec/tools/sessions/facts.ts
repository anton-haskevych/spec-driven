import type { Env } from "../core/env";
import { authorName, type Git } from "../core/git";
import { treeWork } from "../workspaces/changes";
import { claudeSessionRef } from "./session-doc";
import type { SessionFacts } from "./stamp";

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
