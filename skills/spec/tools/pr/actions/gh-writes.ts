import { firstLine } from "../../core/git";
import { isRecord, stringField } from "../../core/frontmatter";
import type { Result } from "../../core/result";
import type { RunResult, Runner } from "../../core/run";
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

// Writes need the exit code, which GhClient's reads ignore; a separate client keeps every read fake unchanged.
export interface GhWrites {
  create(pr: NewPr): Result<CreatedPr>;
  ready(pr: number): Result<void>;
}

export const GH_WRITE_BUDGET = 10;
const PR_URL = /https:\/\/\S+\/pull\/(\d+)/;

export function ghWrites(cwd: string, runner: Runner, budget = GH_WRITE_BUDGET): GhWrites {
  let callsLeft = budget;

  function call(argv: string[]): Result<string> {
    if (callsLeft <= 0) return { ok: false, reason: `gh write budget (${budget}) spent` };
    callsLeft -= 1;
    const result = runner.run(["gh", ...argv], { cwd, timeoutMs: GH_TIMEOUT_MS });
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
  };
}

// gh api errors arrive as a JSON body on stdout; everything else says why on stderr.
function failureReason(result: RunResult, argv: readonly string[]): string {
  const body = parseJson(result.stdout);
  const message = isRecord(body) ? stringField(body, "message") : undefined;
  return message || firstLine(result.stderr) || `gh ${argv[0]} ${argv[1]} exited ${result.code}`;
}
