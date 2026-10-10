---
date: 2026-10-10
spec-phase-at-review: pre-implementation (phase 1 — One green verdict and the full check table; nothing ticked)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: check-source-and-pr-moment
---

# Review — check-source-and-pr-moment

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

The spine is right and all five reviewers said so: one question per PR, a babysit session in its own tab,
a background wait that notifies once, one shared verdict, a merge pinned to the head SHA, infra-only
re-runs, and a written procedure. All five returned **fix-then-proceed**; none said rethink.

What's wrong clusters in three places:

1. **Where checks are read.** The "code head" rule reads check runs from a commit CI never ran on (check
   runs attach to the pushed tip only), so as written `pr wait` would settle `none` on nearly every
   babysit. It also needs a third mapper (REST check-runs, paged at 30) and can't be shared with the
   board, which breaks the "same verdict" metric. Meanwhile `rollup.ts` already maps
   `statusCheckRollup`, dedupes per workflow+name, and is what the board reads. One source, one mapper,
   one dedupe: `gh pr view --json …,statusCheckRollup` on the head. The docs-only-head problem the
   code head was built for gets a probe first and a narrow fallback only if it reproduces.
2. **The PR moment's choreography.** "Launch babysit, then hand off" puts publish-docs' two pushes in
   the middle of the babysat CI run, in the same tree — the #915 failure the spec exists to remove.
   Handoff runs first; launching babysit is the last act.
3. **Shared state the spec invents.** Tool-written PR-link and merge lines appended to one Spec-state
   section on every PR-group branch is the shared-append conflict a load-bearing spec-loop-automation
   gotcha forbids, and neither write had a path to origin. PR claims with a "done when merged" rule put
   GitHub reads into the pure local claim status. Re-run counts read from a per-clone log. Each is
   replaced by something the system already has: PR found by branch, merge line landed on main after
   merge (focus/land pattern), claims freed by liveness + release, re-run cap from GitHub's `attempt`.

Plus a set of verdict-edge bugs (all-skipped undefined, name-only dedupe, stale failed row after a
re-run, re-run on an in-progress run, cancelled-by-timeout read as infra, failsOnMain → merge main) and
structure (pr/ subfolders, commands/pr split, exit code the CLI can't set).

## Forks put to the user

None. Every disagreement was a mechanism choice; none changes what the feature is, moves scope between
specs, or calls the approach wrong. No graduation candidates touch this spec.

## Resolved by the synthesizer

- **Check source = `statusCheckRollup` on the head** (prior-art F2) over a new `CheckRow` + `gh pr checks`
  + REST check-runs. One call per poll, no "no checks reported" exit-1 quirk, no 30-row paging, same
  data the board reads. The craft wave's "don't merge the two mappers" assumed pr-status stays on
  `gh pr checks`; it doesn't. `gh-records.ts`'s checks mapper retires.
- **Code head → probe first** (principal F3, integration F1, adversarial F6). Phase 1 opens with a
  live probe: does a docs-only push on top of code in a CRM PR get checks? If yes, no code head at
  all. If it reproduces zero checks, add the narrow fallback "head has no non-external rows and every
  commit back to the newest checked commit is docs-only (`pathsOutsideSpecDocs`) → read that commit's
  rollup". Never read a commit that wasn't a push tip.
- **Merge record lands on main after merge** rather than dropping it (principal F1 wanted it gone;
  integration F3/F4 and prior-art F3 wanted a landing path). The brief promises "records the merge in
  the spec"; writing it on main after the merge removes both objections: no branch append, no mid-CI
  push, works in `docs: main` and `docs: branch`. Reuses `focus/land.ts`'s commit-onto-origin-tip.
  The PR-link writer at open time is dropped: the PR is found by branch.
- **PR target = `<spec> [<group>]` resolved by branch** `treeName(spec, group).branch` → `gh pr view
  <branch>` (prior-art F6, code-quality F2, adversarial F8). The procedure pins the PR number from
  `pr open` for every later call.
- **PR claims: liveness + release only** (principal F5, integration F5, prior-art F5, code-quality F1).
  `takeRefusal` accepts `pr-<group>` when that group exists; no "done when merged" rule; `trees/find.ts`
  already blocks on any live claim in the tree. Code-quality's typed claim target is the right shape
  for the one place that branches on it (`takeRefusal`); not worth threading through 25 readers now.
- **Re-run cap from GitHub's `attempt` only**; the log is observational (principal F6, prior-art F7).
- **`pr.triage` → `gates.ci-triage`** (four reviewers). Kept, not dropped (principal F2): it is one row
  in `SECTION_KEYS.gates` and reuses the doctor's gate check, and it keeps CRM's triage out of the plugin.
- **Scope trims** (principal F2): `fixedOnMain` dropped (1 of 13 episodes; the triage gate covers
  "already fixed on main"); per-check `check` events and `pr log --all` dropped; `pr status --json`
  dropped (no consumer); `pr wait` exit code dropped (CLI always exits 0 — code-quality F6).
- **`pr/` subfolders** (code-quality F7, Anton's no-flat-dumps rule): `pr/checks/`, `pr/failures/`,
  `pr/actions/`, `pr/babysit/`; existing files move in phase 1's opening refactor commit.
- **`commands/pr.ts` = ACTIONS table only**, verbs in `commands/pr/<verb>.ts` (code-quality F8).
- **`pr wait` timeout default 25m** (adversarial F14): unattended background shells may be capped at
  30 min; the procedure re-waits.

## Findings

Signal: C = consensus, U = unique-insight. ✓ = verified in code/spec by the synthesizer.

### Critical

1. **Code head reads checks from a commit CI never ran on** — C (integration F1, adversarial F6,
   principal F3) ✓ spec technical.md:59-64 + handoff pushes code and docs together (handoff.md:145-149).
   → check source on the head; probe-first fallback (above).
2. **Launch-then-handoff pushes docs mid-CI in the same tree** — C (adversarial F1, integration F2) ✓
   design.md:124, handoff.md:145-154. → handoff first; `launch babysit` is the last act.

### High

3. **Name-only `latestPerName` hides a failed check behind a same-named pass** — C (all five) ✓
   `pr/rollup.ts:52` keys `${workflow}\0${name}`. → one dedupe, workflow+name, in `rollup.ts`.
4. **Spec-name target resolves to another group's PR; `pr merge` can merge it** — C (code-quality F2,
   adversarial F8, prior-art F6) ✓ `pr/resolve.ts:35-44`. → resolve by group branch; pin the number.
5. **Spec-state writers: shared append across group branches, no landing path, mid-CI push** — C
   (principal F1, integration F3/F4, prior-art F3, adversarial F16) ✓ spec-loop-automation
   `gotcha-github-ignores-merge-union.md`. → drop PR-link writer; merge line landed on main post-merge.
6. **PR claim refused by `takeRefusal`; "done when merged" needs GitHub in pure `claimStatus`** — C
   (code-quality F1, principal F5, integration F5, prior-art F5) ✓ `claims/rules.ts:35-41,50`,
   `trees/find.ts:84-86`, `trees/place.ts:109-112`. technical.md's pointer to `store.ts:108` is wrong.
7. **REST check-runs paged at 30 / third mapper** — C (code-quality F3, adversarial F5) — superseded by 1.
8. **Stale failed row after `pr rerun` settles `pr wait` red at once** — U (adversarial F2), inferred.
   → `pr wait --since <iso>` from the last `rerun`/`pushed` event; a queued/zero-time row is newest.
9. **`gh run rerun --job` refused while the run is in progress** — U (adversarial F3), inferred from
   GitHub behaviour. → `pr rerun: run <id> still running — wait`; the procedure re-waits.
10. **`failsOnMain` → "merge main" fixes nothing** — U (adversarial F7) ✓ technical.md:77. → fails on
    main = stop and ask, naming main's failing run.
11. **Scope: ~a third is polish** — U (principal F2). Applied as trims above.
12. **`launch babysit <spec> <group>` impossible today** — C (integration F7, prior-art F8) ✓
    `launch/command-line.ts:22-23`. → babysit takes a group token; resolve to a phase of the group;
    `placeTree` unchanged; never cut a new tree for babysit.

### Medium

13. **Board and `pr status` can't share a code-head verdict** — C (principal F3, adversarial F13,
    integration F9). Resolved by 1: both read the head rollup.
14. **All-skipped rows match no verdict** — U (adversarial F9) ✓ technical.md:56. → `none: skipped`
    ("CI skipped itself — push a new commit").
15. **Board raises merge/fix rows on a PR the babysitter owns** — U (integration F6) ✓
    `board/attention.ts:22-36`. → live `pr-<group>` claim → PR shows `babysitting`, no fix/merge row.
16. **Babysit gets no context pack** — U (integration F8) ✓ `commands/context.ts:5`. → add to `PACK_MODES`.
17. **`pr open` / `pr merge` not retry-safe** — U (integration F11). → already-open-ready and
    already-merged are success paths.
18. **Re-run cap from a per-clone log** — C (principal F6, prior-art F7, adversarial F15). → `attempt`.
19. **Two check models with no retirement; `none:draft` unreachable; `rerun` kind names an action** —
    U (code-quality F4) ✓ `pr/types.ts`, `pr/checks.ts`. → `Check`/`Bucket` stay as the one model
    (rollup-based), bucket gains queued vs running; verdict kind `cancelled`; no `none:draft`.
20. **`pr wait` reuses pr-status's heavy load and dodges the gh budget** — U (code-quality F5) ✓
    `pr/report.ts`. → one `gh pr view` per poll, pure `waitStep`, failure facts only in `pr status`.
21. **`pr wait` exit code has no plumbing** — U (code-quality F6) ✓ `spec.ts:68-73`. → dropped.
22. **`pr/` grows to 22 flat files; `log.ts` vs `log-tail.ts`** — U (code-quality F7). → subfolders.
23. **`commands/pr.ts` will pass 250 lines** — U (code-quality F8), inferred. → per-verb files.
24. **Draft→ready race timings misfire** — U (adversarial F10). → key on the `ready_for_review` run;
    queued ≠ skipped; re-check after the push run registers.
25. **Cancelled-by-timeout and fail-fast siblings read as infra** — U (adversarial F11). → cancelled is
    infra only without "exceeded the maximum execution time" and with no failed sibling in the run.
26. **`pr wait` right after a push judges the old head** — U (adversarial F12). → `--sha` (default:
    tree HEAD); keep waiting until `headRefOid` matches.
27. **Background shell cap vs 60m wait** — U (adversarial F14). → 25m default; settle line also logged.
28. **Limits counted from a log spanning several babysits** — U (adversarial F15). → `babysit-start`
    event; limits count from the latest.
29. **`pr.triage` outside `gates.*`** — C (code-quality F10, principal F7, integration F12, prior-art F4)
    ✓ `doctor/settings.ts:21` iterates only `settings.gates`. → `gates.ci-triage`.
30. **Code-head "docs" check re-implements `isSpecDocPath`, misses nested roots** — U (prior-art F1) ✓
    `publish/push.ts:12-14`. → only relevant to the conditional fallback; use `pathsOutsideSpecDocs`.

### Low

31. **No-tree code-head fallback costs one gh call per commit** — U (code-quality F9). Superseded by 1.
32. **Babysit log home `spec-driven/` vs claims' `spec-board/`** — U (code-quality F10) ✓
    `claims/store.ts:35`. → `<common>/spec-board/babysit/`.
33. **`pr-status` alias is dead weight** — U (code-quality F10). → replace with `pr status`, update prose.
34. **PR factories in generic `factories.ts`** — U (code-quality F10). → `tests/pr-factories.ts`.
35. **Second babysitter / orphan wait** — U (adversarial F17). → claim held → print holder, end.
36. **Who asks: execute §10 and handoff both; numbered answers collide with *Next sessions*** — U
    (integration F12). → asked at the PR gate; handoff asks only if unanswered; the question replaces
    the *Next sessions* block in that message.
37. **Two polling loops; gh calls without timeout** — U (prior-art F9) ✓ `pr/gh.ts` passes no timeout.
    → one `pollUntil` helper; wait reads through the async runner with `GH_TIMEOUT_MS`.
38. **Test gaps** — U (adversarial F19). Fixtures added to the phase lists.

## Rejected or unverified

- **Typed claim target threaded through all `claim.phase` readers** (code-quality F1) — right idea, too
  wide for one caller that branches; `takeRefusal` handles `pr-<group>`, display reads fine as is.
- **Drop the merge record entirely** (principal F1) — the brief promises it; landing on main after
  merge removes the conflict and timing objections.
- **Drop `pr.triage` entirely** (principal F2) — kept as `gates.ci-triage`; tiny and keeps the plugin
  domain-free.
- **`pr wait` lock file against a second wait** (adversarial F17) — the PR claim already prevents a
  second babysitter; not built.
- **Board PR-claim row `next` label** (integration F6, second half) — folded into the `babysitting` cell.
- **Unverified:** GitHub's `pull_request` `paths:` evaluating the whole PR diff (principal F3) — that is
  exactly what phase 1's probe settles. Adversarial F2/F3/F12 are inferred from GitHub behaviour;
  their fixes are cheap and stay.
