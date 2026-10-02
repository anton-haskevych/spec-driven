import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { gitAt, type Git } from "../core/git";
import type { Runner } from "../core/run";

export interface SetupReport {
  copied: string[];
  // `copy <path>: <reason>` — the tree is kept; the session fixes it there.
  failed?: string;
}

const INCLUDE_FILE = ".worktreeinclude";
const FALLBACK_FILES = [".env", ".env.local"];

// Claude Code's own format: gitignore patterns naming the ignored files a new tree needs. Git matches them.
export function copyIncludedFiles(runner: Runner, from: string, to: string): SetupReport {
  const files = existsSync(join(from, INCLUDE_FILE)) ? includedFiles(gitAt(from, runner)) : FALLBACK_FILES.filter((file) => existsSync(join(from, file)));
  const copied: string[] = [];
  for (const file of files) {
    const target = join(to, file);
    if (existsSync(target)) continue;
    try {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(from, file), target);
      copied.push(file);
    } catch (cause) {
      return { copied, failed: `copy ${file}: ${cause instanceof Error ? cause.message : String(cause)}` };
    }
  }
  return { copied };
}

function includedFiles(git: Git): string[] {
  const listed = git.run(["ls-files", "-z", "--others", "--ignored", `--exclude-from=${INCLUDE_FILE}`]);
  const matches = listed.code === 0 ? nulSeparated(listed.stdout) : [];
  if (matches.length === 0) return [];
  const ignored = git.run(["check-ignore", "-z", "--stdin"], { stdin: matches.join("\0") });
  return nulSeparated(ignored.stdout).toSorted();
}

function nulSeparated(text: string): string[] {
  return text.split("\0").filter(Boolean);
}
