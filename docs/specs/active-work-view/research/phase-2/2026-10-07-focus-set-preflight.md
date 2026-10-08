---
date: 2026-10-07
phase: 2
chunk: focus-set
---

# Phase 2 preflight — focus set

*Source of record — do not edit.* `T` = `skills/spec/tools`. Inputs: phase entry, recon note (same folder),
`principles.md`. Self-scaled: small, well-mapped seam.

## Findings that change the plan

1. **Read the set at a pinned sha needs an extraction.** `loadMainline` (`T/mainline/load.ts:30-41`) pins by
   itself and can't take a sha; `repoFacts` (`:43-51`) holds the commonDir + prefix lookup. Extract
   `baseProject(git, sha)` → `{ commonDir, root, dir }` (cache + prefix) and use it from both `loadMainline`
   and `focus/land.ts`. Second use → extract (principle 9).
2. **The target's tip text is already on disk.** technical.md step 2 says `git show <tip>:<path>`; the base
   cache holds that exact file, so read it from `<spec dir>/CLAUDE.md` and derive the repo path with
   `relative(root, …)`. One less spawn, one source.
3. **One validity rule for `focus` / `owner`.** `readSpecMeta` (board: skip a malformed value) and
   `checkSpecMeta` (`T/doctor/spec-meta.ts:19`, error) must not each define "finite ≥ 0". Mirror
   `readSchedule` (`T/core/schedule.ts:16-31`): `readFocusFields(data) → { focus?, owner?, problems }`,
   used by both.
4. **Offline is a fetch failure, not a push refusal.** `pinDefault` (`T/publish/snapshot.ts:24-28`) fails
   before any push when origin is unreachable; the copy table has no line for it. Add
   `focus: can't read origin/<default>: <reason>; nothing written`. Push refusals use `gitFailureReason`
   (`T/core/git.ts:29`), which picks git's `! [remote rejected] …` line; `publish.ts:53` prints all stderr.
5. **`--top` at min 0 ties at 0.** Spec says `min / 2`; with min 0 that is 0, sorted by name. Only reachable
   by a hand-written 0 (halving never reaches 0). Keep as specified, pinned by a test.

## Canon against phase 2 (non-inert rows only)

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions (house 3) | Bites | `focus/rank.ts` and `focus/plan.ts` take data, return values; `land.ts` is the only git seam |
| Single source of truth (house 8) | Bites | finding 3; `NON_FAST_FORWARD` exported from `publish.ts`, not copied |
| SRP | Bites | `commitOnto` knows index plumbing only; callers build index-info (snapshot: `ls-tree`, focus: `hash-object`) |
| Errors are values (house 15) | Bites | land returns a tagged outcome: refused (plan) vs push/fetch refused, rendered by `commands/focus.ts` |
| DIP | Bites | land takes `Git`; tests pass `gitAt(dir, isolatedRunner)` and a wrapping runner for the race |
| Pass B / D | Inert | tool code, no layers or aggregates |

## Amendments

1. Add `baseProject` extraction to `mainline/load.ts` (own commit, `mainline-load` tests green).
2. `readFocusFields` in `core/spec-meta.ts`; `checkSpecMeta` spreads its problems.
3. `commitOnto(git, base, indexInfo, message)` in `publish/commit-onto.ts` with a real-git test; `snapshotCommit`
   calls it.
4. Copy: add the fetch-failure line; `main moved twice` line mirrors `publishDocs`.

## Seam/testability deltas

- Race test: wrap `isolatedRunner` so the first `git push` first lets the other clone push. No new harness.
- Refusal test: `pre-receive` hook (`exit 1`) in the bare origin.

## Decisions for you

None.
