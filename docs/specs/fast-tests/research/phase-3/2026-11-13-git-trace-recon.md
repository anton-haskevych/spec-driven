# Phase 3 — git trace of the phase 4–8 targets (recon)

Date: 2026-11-13. Result: `technical.md` §4 *The trace*. This note keeps the tool so phase 3a (and any later
phase) can re-run it after the seams move.

## How it ran

```bash
# from skills/spec/tools; one file at a time so each log is per command
TRACE_LOG=<log>.jsonl bun test --timeout 120000 --preload <trace-preload.ts> tests/<file>.git.test.ts
```

`--timeout 120000` matters: capturing a 200-frame stack on every spawn pushed four files' `beforeEach` repo builds
past bun's 5 s limit (claim-command, claims-live, board-command, land-on-main).

A line is the test's own setup when its first non-runner frame is in `tests/`. Production code a test calls
directly to seed (e.g. `gitRecordPort` from `joinedRepo`) still counts as non-setup, and after an `await` bun's
stack starts at the resumption point, so the outermost frame is not always the command.

## trace-preload.ts

```ts
import { appendFileSync } from "node:fs";
const TOOLS = "/Users/antonhaskevych/claude-worktrees/spec-driven/fast-tests-pr-a/skills/spec/tools/";
const run = await import(TOOLS + "core/run.ts");
const LOG = process.env.TRACE_LOG!;
Error.stackTraceLimit = 200;

interface Frame { fn: string; loc: string }
function frames(): Frame[] {
  return (new Error().stack ?? "").split("\n").slice(1).map((l) => l.trim().replace(/^at /, ""))
    .filter((l) => l.includes(TOOLS))
    .map((l) => { const m = l.match(/^(.*?) \((.*)\)$/); return m ? { fn: m[1]!, loc: m[2]!.replace(TOOLS, "") } : { fn: "", loc: l.replace(TOOLS, "") }; });
}
const isRunnerWrapper = (f: Frame) => f.loc.startsWith("core/run.ts") || f.loc.startsWith("core/git.ts") || (f.loc.startsWith("tests/git-repo.ts") && /\brun$/.test(f.fn)) || (f.loc.startsWith("tests/stub-runner.ts") && /\brun$/.test(f.fn));
function record(argv: readonly string[]) {
  if (argv[0] !== "git" && argv[0] !== "gh") return;
  const fs = frames().filter((f) => !isRunnerWrapper(f));
  const first = fs[0];
  const setup = !first || first.loc.startsWith("tests/");
  const prod = fs.filter((f) => !f.loc.startsWith("tests/"));
  const short = (f?: Frame) => f ? `${f.fn} ${f.loc.replace(/:\d+$/, "")}` : null;
  appendFileSync(LOG, JSON.stringify({ argv, setup, at: short(first), entry: short(prod.at(-1)) }) + "\n");
}
for (const r of [run.systemRunner, run.systemAsyncRunner]) {
  const orig = r.run.bind(r);
  (r as any).run = (argv: readonly string[], options?: unknown) => { record(argv); return orig(argv, options as any); };
}
```

## Grouping rules (classify.ts, abridged)

By the innermost production frame: `record/ref.ts`, `record/read.ts` and record-ref lease pushes → `recordPorts`;
`core/land-on-main.ts` and non-record `commit-tree` → `land`; `plan/board-base.ts`, `mainline/base-cache.ts`,
`baseProject`, `pinDefault`, `plan/upgrade-send.ts` → `boardBase`; the rest of `mainline/load.ts` → `mainline`;
`claims/remote*`, `refs/spec-claims` pushes, `remoteHeldClaims` → `remote`; then by argv for the stub groups
(common dir, toplevel, origin/HEAD, ident, HEAD facts, treeWork, worktree scans, push, holders).
