# PR Opening — Owner Split

## Spec state

Spec written 2026-10-17 from prep (wave 1 + craft). 4 code phases, one PR (Anton, 2026-10-17):
**PR A: phases 1–4** on `feat/owner-split-pr-a`. Order: 1 first; then 2, 3 and 4 (3 after 2 and 4 after 3: shared files, not dependencies).
One minor version, picked at merge (main's minor + 1).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never
straight to `main`.

- [ ] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `board-no-focus-golden.test.ts`)
- [ ] `bun run typecheck` clean
- [ ] `bun install --frozen-lockfile` clean (no new runtime deps)
- [ ] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added
- [ ] New and touched tool files under 250 lines, functions under 50 (`principles.md`)
- [ ] `bun skills/spec/tools/spec.ts doctor owner-split` has no errors
- [ ] From CRM (`~/IdeaProjects/crm`), with this branch's tools: `board ready --for me --json` has no `owner: taras` rows; `board --who taras` lists all 6 of his specs; `crew launch execute cross-studio 1a` refuses before any tree is cut. Output pasted here
- [ ] `runnerName` refuses with no git identity (`GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1` in a scratch repo); output pasted here
- [ ] `runnerName` succeeds with `user.name` set and `user.email` unset; output pasted here
- [ ] Before merge, tell Anton: CRM `permission-aware-ui` (`owner: taras`) stops being picked by his crew, and a relaunch of it is refused naming the branch holding its unmerged work
