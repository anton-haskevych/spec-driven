# PR Opening — Owner Split

## Spec state

Spec written 2026-10-17 from prep (wave 1 + craft). 4 code phases, one PR (Anton, 2026-10-17):
**PR A: phases 1–4** on `feat/owner-split-pr-a`. Order: 1 first; then 2, 3 and 4 (3 after 2 and 4 after 3: shared files, not dependencies).
One minor version, picked at merge (main's minor + 1).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never
straight to `main`.

- [x] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `board-no-focus-golden.test.ts`)
  1366 pass, 0 fail across 174 files at 557f8a7; typecheck clean; frozen install: no changes; doctor: clean
- [x] `bun run typecheck` clean
- [x] `bun install --frozen-lockfile` clean (no new runtime deps)
- [x] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added
  2.50.0 (main at 2.49.0); `version.py`: all declarations match; ROADMAP row under *Owner split (2.50)*
- [x] New and touched tool files under 250 lines, functions under 50 (`principles.md`)
  28 touched non-test files: largest `board/model.ts` 224 lines; 353 functions scanned (ast-grep), none at 50+. `tests/context.test.ts` is 378 lines on main already (this branch changed 1 line).
- [x] `bun skills/spec/tools/spec.ts doctor owner-split` has no errors
- [x] From CRM (`~/IdeaProjects/crm`), with this branch's tools: `board ready --for me --json` has no `owner: taras` rows; `board --who taras` lists all 6 of his specs; `crew launch execute cross-studio 1a` refuses before any tree is cut. Output pasted here
  ```
  # 2026-10-17, CRM origin/main 5d5a4b2, tools at feat/owner-split-pr-a
  $ board ready --for me --json | jq   # Taras: cross-studio gift-cards permission-aware-ui staff-ios-app-multi-location staff-ios-app-release tap-to-pay-payments
  ready rows: 110 · ready rows on taras specs: 0 · ready rows with owner taras: 0
  $ board --who taras
  TARAS
    owns    cross-studio ready 1a, 9, 5 +1 · gift-cards ready 7 · permission-aware-ui ready 3b · +3
    on now  —
    PRs     #970 draft dev-email-isolation pr-a · #964 draft spec/staff-ios-app-release · … · #143 draft staging
  $ board --who taras --json --local | jq '.board.people[].owns[].spec'   # text folds past 3, per design.md
  cross-studio gift-cards permission-aware-ui staff-ios-app-multi-location staff-ios-app-release tap-to-pay-payments
  # crew launch ran in a scratch clone of CRM (same origin/main): CRM's live run.md predates `runner:`
  $ crew start
  Crew: started for anton-haskevych · overseer e23e6bc1-… · 3 workers, 2 babysitters
  $ crew launch execute cross-studio 1a
  launch: cross-studio is taras's; this crew is anton-haskevych's. Open it in your own session instead
  trees cut: 0 · git worktree list: main only
  ```
- [x] `runnerName` refuses with no git identity (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1` in a scratch repo); output pasted here
  ```
  $ GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 git init; runnerName(gitAt(cwd))
  {"ok":false,"reason":"can't tell who you are; set git user.name"}
  ```
- [x] `runnerName` succeeds with `user.name` set and `user.email` unset; output pasted here
  ```
  $ git config user.name "Taras Korpach"; git config --get user.email   # (unset)
  {"ok":true,"value":"Taras Korpach"}
  ```
- [x] Before merge, tell Anton: CRM `permission-aware-ui` (`owner: taras`) stops being picked by his crew, and a relaunch of it is refused naming the branch holding its unmerged work
  The overseer told Anton before launching this PR (overseer brief, 2026-10-17)
