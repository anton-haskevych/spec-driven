import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Git } from "../core/git";
import type { Result } from "../core/result";

// `indexInfo` is `git update-index -z --index-info` input (what `git ls-tree -z` prints). A scratch index
// keeps the checkout's index and working tree untouched. No base: a first commit, starting from an empty tree.
export function commitOnto(git: Git, base: string | undefined, indexInfo: string, message: string): Result<string> {
  const scratch = mkdtempSync(join(tmpdir(), "spec-commit-"));
  const env = { GIT_INDEX_FILE: join(scratch, "index") };
  try {
    const read = git.out(base ? ["read-tree", base] : ["read-tree", "--empty"], { env });
    if (!read.ok) return read;
    const staged = git.out(["update-index", "-z", "--index-info"], { env, stdin: indexInfo });
    if (!staged.ok) return staged;
    const tree = git.out(["write-tree"], { env });
    if (!tree.ok) return tree;
    return git.out(["commit-tree", tree.value, ...(base ? ["-p", base] : []), "-m", message]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
