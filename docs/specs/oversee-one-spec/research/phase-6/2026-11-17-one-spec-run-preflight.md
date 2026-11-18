# Phase 6 preflight — the overseer runs a spec end to end

Self-scaled: one pure field in the brief, the rest is mode-doc prose. Canon passes mostly Inert.

## Findings that change the plan

1. **The brief's spec-branch line is lane-only.** technical.md → *Phase 6* gives one line for "the brief"; but a
   ship-alone group's worker PRs to main (`pr/groups.ts` `specLayout`: base `default` when `shipsAlone`) and
   `merge-back` refuses it (`commands/merge-back.ts:36` → "is not a lane of"). The line goes in only when the placed
   branch is a lane: `laneOf(layout, placed.value.branch)` (`launch-session.ts:47-49` has the branch).
2. **The brief would tell a lane worker "not set (the overseer asks at the PR moment)"** (`crew/brief.ts:28`), which
   a one-spec run never does: the final PR holds by default (`decision-final-pr-holds-by-default`). With a spec
   branch and no mode, say `hold-for-review (nothing set: the final PR holds for review)`.
3. **`crew start --spec` always means spec-branch mode** (`commands/crew/overseer.ts:44` → `startSpecBranch`); a spec
   off the record is refused (`crew/spec-branch-start.ts:30`). The *One spec* section says so up front and passes the
   refusal on; it never offers a "files" variant.
4. **`crew check <id>` misreads a lane** (`gotcha-crew-check-reads-no-record`; `commands/crew/check.ts` reads no
   record). The section tells the overseer the tick's close-out is the verdict for lane workers.
5. **The `Crew:` line must be in the `[handoff]` commit body before `merge-back --push`**: close-out reads
   `origin/<lane>`'s `[handoff] <spec>` body (`crew/lane-close-out.ts:41-43`), and the push is what puts it there.
   handoff.md §3 orders commit (with Crew line) → `merge-back` → gates → `merge-back --push` → tidy → claim release.

## Clean Code against the brief change

| Rule | Verdict | Concrete consequence |
|---|---|---|
| No flag arguments | Bites | `BriefRequest.specBranch?: string` (data: the branch name), not a boolean `lane` |
| One level of abstraction | Bites | The lane decision is a pure `laneSpecBranch(layout, branch)` beside `laneOf` in `pr/groups.ts`; `launch-session.ts` only loads the layout and calls it |
| Simple design / no duplication | Bites | `lane-close-out.ts:31-33` inlines the same pair; reuse the new helper there (second use) |
| Errors, null | Inert | |

## Clean Architecture / SOLID / DDD

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Dependency rule | Bites | `crew/brief.ts` stays pure render (types only); I/O (`loadSpecLayout`) stays in `commands/crew/launch-session.ts` |
| SRP | Inert | |
| DIP | Bites | Use `deps.runner` (already passed to `launchInBackground`), `fetch: false`: the tick fetched the record |
| DDD | Skipped | No domain model in scope |

## Guard blindness

`commands-table.test.ts` checks every `tools/spec.ts <cmd>` a mode file names: new `merge-back` / `ready` mentions
must use that form to be checked. A bare `merge-back <spec>` in prose is not checked, which is fine for brief text.

## Seam and testability

No deltas from recon. `laneSpecBranch` is pure (layouts built with `specLayout` + `phaseState`, as in
`crew-tick-step.test.ts:148-157`).

## Amendments

1. `pr/groups.ts`: `laneSpecBranch(layout, branch)` → `feat/<spec>` for a lane, else undefined; `lane-close-out.ts`
   uses it.
2. `crew/brief.ts`: `specBranch?` adds the spec-branch line after the `Spec …` line; ship text with a spec branch and
   no mode reads hold-for-review.
3. `launch-session.ts`: execute launches only, `loadSpecLayout(tree, deps.runner, spec, { fetch: false })`.

## Defaults applied

- Lane-only spec-branch line (ship-alone workers and non-mode specs get none).
- Unset ship mode in a spec-branch brief reads hold-for-review.
- Overseer trusts the tick's close-out for lanes over `crew check`.

## Forks for you

None.
