import { firstLine } from "../../core/git";
import { isRecord, stringField } from "../../core/frontmatter";
import type { Result } from "../../core/result";
import type { RunResult, Runner } from "../../core/run";
import type { MergeMethod } from "../../playbook/settings";
import { GH_TIMEOUT_MS } from "../gh-lists";
import { parseJson } from "../gh-records";

export interface NewPr {
  base: string;
  head: string;
  title: string;
  body: string;
  draft: boolean;
}

export interface CreatedPr {
  number: number;
  url: string;
}

export type MergeResult = { merged: true; sha: string } | { merged: false; status?: number; message: string };

// Writes need the exit code, which GhClient's reads ignore; a separate client keeps every read fake unchanged.
export interface GhWrites {
  create(pr: NewPr): Result<CreatedPr>;
  ready(pr: number): Result<void>;
  merge(pr: number, method: MergeMethod, headSha: string): MergeResult;
}

export const GH_WRITE_BUDGET = 10;
const PR_URL = /https:\/\/\S+\/pull\/(\d+)/;
const HTTP_STATUS = /\(HTTP (\d{3})\)/;

export function ghWrites(cwd: string, runner: Runner, budget = GH_WRITE_BUDGET): GhWrites {
  let callsLeft = budget;

  function run(argv: string[]): RunResult | string {
    if (callsLeft <= 0) return `gh write budget (${budget}) spent`;
    callsLeft -= 1;
    return runner.run(["gh", ...argv], { cwd, timeoutMs: GH_TIMEOUT_MS });
  }

  function call(argv: string[]): Result<string> {
    const result = run(argv);
    if (typeof result === "string") return { ok: false, reason: result };
    return result.code === 0 ? { ok: true, value: result.stdout } : { ok: false, reason: failureReason(result, argv) };
  }

  return {
    create(pr) {
      const argv = ["pr", "create", "--base", pr.base, "--head", pr.head, "--title", pr.title, "--body", pr.body, ...(pr.draft ? ["--draft"] : [])];
      const created = call(argv);
      if (!created.ok) return created;
      const match = PR_URL.exec(created.value);
      return match?.[1] ? { ok: true, value: { number: Number(match[1]), url: match[0] } } : { ok: false, reason: "gh pr create printed no PR url" };
    },
    ready(pr) {
      const marked = call(["pr", "ready", String(pr)]);
      return marked.ok ? { ok: true, value: undefined } : marked;
    },
    merge(pr, method, headSha) {
      const argv = ["api", "-X", "PUT", `repos/{owner}/{repo}/pulls/${pr}/merge`, "-f", `merge_method=${method}`, "-f", `sha=${headSha}`];
      const result = run(argv);
      if (typeof result === "string") return { merged: false, message: result };
      return result.code === 0 ? mergedSha(result.stdout) : refusedMerge(result, argv);
    },
  };
}

function mergedSha(stdout: string): MergeResult {
  const body = parseJson(stdout);
  const sha = isRecord(body) && body.merged === true ? stringField(body, "sha") : undefined;
  return sha ? { merged: true, sha } : { merged: false, message: "GitHub's merge reply had no merge commit" };
}

// A 405/409 arrives as exit 1 with GitHub's JSON error body on stdout; the status is in the body or gh's stderr.
function refusedMerge(result: RunResult, argv: readonly string[]): MergeResult {
  const body = parseJson(result.stdout);
  const status = Number((isRecord(body) ? stringField(body, "status") : undefined) ?? HTTP_STATUS.exec(result.stderr)?.[1]);
  const message = failureReason(result, argv);
  return Number.isInteger(status) ? { merged: false, status, message } : { merged: false, message };
}

// gh api errors arrive as a JSON body on stdout; everything else says why on stderr.
function failureReason(result: RunResult, argv: readonly string[]): string {
  const body = parseJson(result.stdout);
  const message = isRecord(body) ? stringField(body, "message") : undefined;
  return message || firstLine(result.stderr) || `gh ${argv[0]} ${argv[1]} exited ${result.code}`;
}
