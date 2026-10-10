# Phase 4 recon — pr open (2026-10-10)

Single inline wave: the seam was already mapped by technical.md and phases 1–2.

## Seam
- `pr/gh.ts:20-46` — `ghClient` sync read client; `call` ignores exit codes, caches `runJobs`/`runWorkflowId`, budget 30. `prView(pr?: number)` takes a number only; `gh pr view <branch>` needs a string target.
- `pr/gh-records.ts:13-27` — `toPrView`; `url` is not in `PR_FIELDS` (`gh.ts:16`), so "already open · <url>" needs it.
- `pr/resolve.ts:30-41` — `resolvePr(gh, dir, target?)`: number, else spec → Spec-state links → newest open (the wrong-PR rule with two groups). Callers: `commands/pr/status.ts:13` (args[0]), `commands/pr/log.ts:40-45` (one positional).
- `commands/pr.ts:9-12` — `ACTIONS` table; add `open`.
- `trees/naming.ts:7` — `treeName(spec, group).branch` = `feat/<spec>-pr-<g lowercased>`.
- `core/spec-state.ts:43-65` — `loadSpecState` gives phases with `edges.pr`, `name`, `code`, `summary.outcome` (bold `**Outcome:**` parses, `tests/context.test.ts:86`).
- `ready/render.ts:15-24` — groups code phases by `edges.pr` (the same grouping open/resolve need; render-only, not reusable as is).
- `publish/push.ts:20` — `pushBranch(git, defaultBranch)`: pushes the *current* branch; refuses detached HEAD / code on default.
- `core/run.ts:87` — `defaultBranch`; `pr/gh-lists.ts:5` — `GH_TIMEOUT_MS = 10_000`.
- `pr/babysit/log.ts:33` — `appendEvent(dir, pr, event)`; `opened` and `ready` kinds exist. Dir via `stateDir(gitAt(dir, runner), "babysit")` (`commands/pr/log.ts:22`).

## Reuse
- `stubRunner` / `sequencedRunner` (`tests/stub-runner.ts`), `prView()` factory (`tests/pr-factories.ts`), `createTree().spec()` (`tests/tree.ts`).
- `firstLine`, `parseJson`, `isRecord`/`numberField`/`stringField` for gh output.
- No `pollUntil` yet (phase 3 not landed): create `pr/babysit/poll.ts` here; phase 3's wait reuses it.

## Testing-issue estimate
- `gh run list` has no action type: a `ready_for_review` run can't be told from a `synchronize` one by fields. Key on run ids: runs seen before `gh pr ready` vs new ones after it.
- Waiting needs an injectable clock + sleep, so the race is testable without real time.
- `GhClient` has one hand-written fake (`tests/pr-main-compare.test.ts:13`); adding a read method touches it. Race code takes a narrow `Pick<GhClient, …>`.
- `gh pr create` prints the URL on stdout; gh API errors can arrive as JSON on stdout with exit 1 — exit code decides, never "stdout parsed".
- No file near 250 lines on the path; open orchestration split into groups / pr-text / ready-race / open to stay under it.
