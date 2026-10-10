---
date: 2026-10-10
wave: craft
lens: craft
slug: pr-commands-verdict-fixtures
brief: product-brief.md
---

# Craft Wave — pr-commands-verdict-fixtures

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: naming & placement, test conventions & fixtures, extraction-for-reuse. Paths under `skills/spec/tools/` unless rooted.

## Naming & placement

- **Command table** `spec.ts:28-54` (`COMMANDS`, `USAGE`), pinned by `tests/commands-table.test.ts:5-13` (usage starts with its key, appears in USAGE). Styles in use: single word (`push`, `ready`, `board`), `noun-verb` (`pr-status`, `publish-docs`), group `noun <verb>` (`phase tick|deployed|add|split`, `claim`, `trees`, `focus`).
- **Group exemplar** `commands/phase.ts:14-40` (`ACTIONS` table of `{usage, run}`, joined usage, `Object.hasOwn` dispatch) — better than `claim.ts`/`trees.ts` if-chains. **Thin-command exemplar** `commands/pr-status.ts:8-20` (`X_USAGE`, `(projectDir, args, runner = systemRunner)`, refusals `pr-status: …`). Commands may be async (`spec.ts:25`, `trees.ts`, `claim.ts`).
- **Collision**: top-level `ready` exists (`commands/ready.ts`, phase ready set) — "mark PR ready" can't be `ready`; inside a `pr` group it reads close.
- **Domain folder** `pr/` (all files 19–79 lines). New logic files and their exemplars: wait/verdict → after `pr/checks.ts`/`pr/report.ts`; triage → after `pr/checks.ts`; merge → after `publish/push.ts` (mutating step returning `Result`); one-line renderers → `pr/render.ts`, styled like `publish/render.ts:6-13`. Spec-state merge record → writer after `phases/deployed.ts:23-41` (`EditPlan` → `issuesIntroducedBy` → `core/apply-edits.ts:20`), wired like `phase deployed` in `commands/phase.ts`.
- **Prose placement options**: (a) section of `execute.md` §10 (`:150-167`); (b) on-demand reference file like `principles.md`/`archetypes.md`/`legacy-layout.md` (e.g. `skills/spec/babysit.md`, linked from §10 and handoff); (c) a `/spec babysit` sub-command — costs `SKILL.md:4` argument-hint, `:38` sub-command set, Dispatch row, a thin router `skills/spec-babysit/SKILL.md` (exemplar `skills/spec-status/SKILL.md`, `disable-model-invocation: true`), all pinned by `tests/skill-wiring.test.ts:89-112` and `context/request.ts:9`; gains `launch babysit <spec>` for free (`launch/command-line.ts:17-29`); (d) a separate skill like `skills/phase-preflight/`.
- **Output lines**: `Label: a · b · c` (`Remote:` `publish/render.ts:12`, `Tree:` `trees.ts:49-50`, `Launched:` `launch.ts:35`); refusals `<command>: <reason>`; domain refusals `claim refused: …; <hint>`; handoff treats `push:`/`publish-docs:` prefixes as refusals (`handoff.md:150`). pr-status header `PR #n <status> · mergeable X · head <8-char sha>` (`pr/render.ts:16-19`) — SHA length 8 there vs 7 in `publish/render.ts:4`.
- **Settings keys**: kebab-case YAML / camelCase TS, sections `pr`, `checks`, `gates` (`playbook/settings.ts:7-30,50-75`), `describeSettings` phrases joined by ` · ` (pinned `tests/settings.test.ts:75-95`), doctor `doctor/settings.ts:16-24`. Docs: `README.md:112`, `SKILL.md:95`, `execute.md:163,167`, YAML example `docs/specs/spec-loop-automation/technical.md:20-27`. Natural homes: `checks.*` (beside `external`) and `pr.*`.
- **Docs rows**: README "Session lifecycle and tools" (`:99-124`) next to PR status (`:115`) and Push and publish (`:118`); ROADMAP needs a new section + version row.

## Test conventions & fixtures

- Tests live in `skills/spec/tools/tests/`, flat, `pr-<module>.test.ts`; fixtures in `tests/fixtures/` (excluded from discovery by `bunfig.toml`), loaded via `Bun.file(join(import.meta.dir, "fixtures", name))`.
- `stub-runner.ts`: `stubRunner` (prefix match, fixed reply, `.calls`), `asyncStubRunner`, `cannedGh`. **No sequenced replies** — `sequencedRunner` exists only locally in `tests/pr-report.test.ts:16-27` (queue per prefix, repeats last) → promote for poll/merge-async tests.
- Typed fakes instead of `as unknown as`: throwing `unused()` stubs for unused interface methods (`tests/pr-main-compare.test.ts:7-29`), `Partial<T>` override factories, hand-typed `Runner` literals (`publish.test.ts:97`, `pr-gh-lists.test.ts:23`). The repo has zero `as unknown as`.
- `PrView` is hand-built in 5 tests (`pr-status.test.ts:7-9` `view()`, `pr-checks:7`, `pr-gh:7`, `pr-report:13`, `pr-render:9`) — a shared `prView()` (+ `check()`, `run()`) factory is the extract-on-2nd-use case. `tests/factories.ts` has nothing for PR/check/run; `board-factories.ts:100-103` `prRow` (no checks), `NOW = 2026-10-01T20:00:00Z`.
- Real git: `tests/git-repo.ts:17-23,63-87` `isolatedRunner`, `repoWithOrigin` (ledger `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`; ~0.5–1 s per test → keep classification in pure parsers).
- Clock: `now: Date` dependency (`commands/board.ts:13,18`, `claims/store.ts:68`) or `--date` for writers (`commands/phase.ts:67`); timeouts via `RunOptions.timeoutMs` (`core/run.ts:11,36-38`), asserted by capturing options (`pr-gh-lists.test.ts:21-31`). Bounded retries tested by wrapping the runner (`publish.test.ts:92-144`). Nothing polls today.
- Writers: plan-validate-apply (`docs/specs/spec-loop-automation/ledger/principle-writers-plan-validate-then-apply.md`, `domain-writer-building-blocks.md`); every writer test ends with a `loadSpecState` round-trip (`deployed.test.ts:20-58`, idempotence `:47-53`). No writer edits `pr-opening.md` yet; readers: `pr/resolve.ts:30`, `board/load.ts:88`, `commands/gates.ts:19`.

### Fixture map

| Need | Reuse / extend / create |
|---|---|
| Job log tail | reuse `gh-job-log.txt` |
| Jobs with `databaseId`, conclusions | reuse `gh-run-jobs.json` |
| Actions vs Vercel StatusContext split | reuse `gh-pr-list-open.json` rollups; `gh-pr-checks.json` (Vercel `workflow:""`) |
| Draft head, everything SKIPPED | reuse `gh-pr-checks-by-pr.json` PR 566 |
| Vercel `crm-dance-landing` PENDING, all Actions green | **create** (checks fixture or by-pr key) |
| Cancelled run/check | **extend** — no `cancel` bucket in any fixture (`pr-checks.test.ts:12` asserts 0) |
| Stale draft-era SKIPPED + newer SUCCESS, same names, two run ids | **create** (only inline today, `pr-rollup.test.ts:46-50`) |
| Docs-only head, zero checks, "no checks reported" exit 1 | inline (as `pr-status.test.ts:37`) |
| Runs keyed by head SHA | **create** `gh-run-list-by-head.json` (`headSha`, `status`, `event`, `workflowName`) — `gh-run-list.json` lacks `headSha` |
| Merge PUT 200 / 405 / 409; merge-async 202 + poll pending→merged/failed | **create**, real GitHub `message` bodies |
| `gh pr view` with `headRefName`/`baseRefName`/`url` | **extend** `PR_FIELDS` (`pr/gh.ts:18`) and the view builder |

## Extraction for reuse

- **Green verdict**: counts are already shared (`summarizeChecks`, `pr/checks.ts:13-20`, used by `pr/report.ts:40` and `pr/rollup.ts:59`); the *verdict* is split: `prState` (`pr/checks.ts:22-31`: ignores cancel, zero checks = green) vs board `toPrCell`/`nextFromChecks` (`board/joins.ts:46-52,72-76`: cancel = failing, needs ≥1 pass, ignores mergeable) → `board/attention.ts:31-36`, `board/cells.ts:71-79`, `board/focus.ts:82`. Extract a pure `checksVerdict(summary)` (e.g. `pr/verdict.ts`); input must be the summary, not raw checks (two bucket vocabularies: `pr/gh-records.ts:61` vs `pr/rollup.ts:23`). Re-pins: `pr-checks.test.ts:35`, `board-joins.test.ts:84-88,102-103`, `board-render.test.ts:89-115`, `board-attention.test.ts:9-28`, `pr-render.test.ts:23-59`, `pr-status.test.ts:25`; `PrCell` (`board/model.ts:19-25`) if cancel gets its own count.
- **gh writes**: `pr/gh.ts:26-37` `call` ignores exit codes (fine for reads, wrong for a merge PUT whose 405/409 body is valid JSON) and has no timeout. Reads (runs by head SHA, extra `PR_FIELDS`) extend `GhClient`; writes (`pr ready`, `run rerun`, merge PUT/async) belong in a sibling (e.g. `pr/gh-actions.ts`) with exit-code-aware results and their own budget — widening `GhClient` grows every object-literal fake (`pr-main-compare.test.ts:13-20`). Budget is per client and pr-status builds a fresh client per call (`commands/pr-status.ts:11`).
- **Waiting cannot live in the tool**: `systemRunner` is `Bun.spawnSync` (`core/run.ts:29-44`) → a `--watch` blocks the agent's turn; `systemAsyncRunner` (`:46-63`) still runs to completion. The wait is a background-Bash `gh pr checks --watch --fail-fast` in prose; the tool supplies the one-shot verdict afterwards.
- **Spec state**: `SPEC_STATE`/`PR_LINK` regexes (`pr/resolve.ts:14-15`) + `specPrNumbers` (`:17-21`, also `board/load.ts:88`) — a merge writer is their 2nd use → lift to `core/` (e.g. `core/spec-state-section.ts`). `frontmatter-patch`, `checkbox`, `markdown` don't fit (frontmatter-only / tasks-only / read-only). No checker validates `pr-opening.md`; validation = "`specPrNumbers` still parses the same after the edit".
- **Already fixed on main**: different question from `compareOnMain` (`pr/main-compare.ts:11-26`, first-match). Needs run history + `git merge-base --is-ancestor` (`core/git.ts:9`); new pure classifier (e.g. `pr/main-fixed.ts`), sharing a `mainJobHistory` walk with main-compare; `WorkflowRun` (`pr/types.ts:26-30`) / `RUN_FIELDS` (`gh.ts:20`) need `headSha`; `mainLine` (`pr/render.ts:41-46`) pins move. Ledger `gotcha-squash-merged-branch-is-not-an-ancestor` applies.
- **Ignored checks**: glob match is inline at `pr/checks.ts:14-15` (setting parsed `playbook/settings.ts:53`). Reuse `checks.external` as the ignore list, or add a key and extract `matchesAnyName(patterns, name)` with a test; leave path-glob users (`lessons/recall.ts:14`, `lessons/graduation.ts:19`, `mainline/base-cache.ts:32`) alone.
- **Size**: nothing near 250 lines (largest touched: `board/model.ts` 156, `board/focus.ts` 149, `playbook/settings.ts` 124, `commands/context.ts` 113). `needsYou` (`board/attention.ts:16-20`) is a ~300-char one-liner — split into a source list before adding a source.

### Don't extract
- Board's async rollup/list fetch (`pr/gh-lists.ts`, `pr/rollup.ts`) — built for one 10 s parallel board load.
- The two bucket mappers (`gh-records.ts:61`, `rollup.ts:23`) — different gh vocabularies.
- `ghClient`'s cache/budget — not generic for writes.
- A polling loop in `core/run.ts`.

## Craft decisions for `create` to lock (not resolved here)

1. Command shape: `pr <verb>` group (exemplar `phase.ts`) vs more `pr-*` commands; `pr-status` stays, aliases, or becomes `pr status`; name for "mark ready" given `ready`.
2. Prose home: execute §10 section vs `babysit.md` reference vs `/spec babysit` sub-command (+ router, wiring test, launchable) vs separate skill.
3. Verdict input/output: `checksVerdict(CheckSummary) → failing | pending | passing | none`; cancelled = failing, ignored, or "needs rerun"; zero checks (docs-only head) never green; ≥1 pass rule.
4. Which checks matter: reuse `checks.external` as "ignored" vs new `checks.ignore` / `checks.required`; GitHub's required list when it exists.
5. Judge green on the head or on the last code-bearing commit; how a docs-only head is detected.
6. gh writes: sibling client file, exit-code checks, own budget; plain PUT merge (`sha=` pinned) vs async merge API.
7. `PrView` gains `headRefName`, `baseRefName`, `url`.
8. "Already fixed on main": new module vs generalised main-compare history walk.
9. Spec-state merge record format (must still parse via `PR_LINK`), writer as `EditPlan`, `--date`, round-trip test; lift `SPEC_STATE`/`PR_LINK` into `core/`.
10. Board: a "babysitting" state on the PR cell vs nothing (phase claims can't hold it); unify goldens in the same change as the verdict or just before.
11. Test infra: promote `sequencedRunner`; shared `prView()`/`check()`/`run()` factories; fixtures real CRM captures vs `acme/app` synthetic; clock as `now`/deadline.
12. Output labels (`PR:`, `Merged:`), refusal prefix, SHA length (7 vs 8).
