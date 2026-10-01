# Phase 7 preflight — publish and push

Inputs: `phases/phase-7-publish-and-push.md`, `research/phase-7/2026-09-30-snapshot-recon.md`, `principles.md`. Paths relative to `skills/spec/tools/` unless rooted.

## Findings that change the plan

1. **Files to touch omits `README.md`.** technical.md → *Conventions* says every new command gets a README line; `README.md:104` holds the pr-status one. Add `push` / `publish-docs` lines there.
2. **`merge-tree --write-tree` needs git ≥ 2.38, and the plan reads any non-zero exit as a conflict.** Step 5 says "exit 1 → conflict". An older git exits 129 (unknown option) — treating that as "diverged on main" would send the agent to merge main for nothing. Exit 1 = conflict; any other non-zero = error naming the stderr and "git ≥ 2.38".
3. **No outcome for "published, but the merge-back failed".** After step 6 the docs are on main; if `git merge --no-edit X` then fails (a merge in progress, a local edit to a published file), the plan has no message. Report `published … (sha); merge-back failed: <stderr>; run git merge <X>` — never roll back main.
4. **Snapshot base can be another spec's snapshot.** `git log -1 --grep '^docs(spec): snapshot' HEAD` (technical.md step 2) also finds a snapshot that arrived through a merge of main. Safe — `merge-tree` sees identical changes on both sides — but untested. Add a test: branch B merges main after branch A published, then publishes cleanly.
5. **handoff order (plan deltas).** Plan says `push` → `publish-docs`; the delta makes `publish-docs` push the branch first (idempotent), so `docs: main` handoffs make one call and get one complete `Remote:` line. Record as a decision; update technical.md's command row and design.md flow line.

## Canon against phase 7

| Rule | Verdict | Concrete consequence |
|---|---|---|
| Pass A — names / small functions | Bites | `snapshot.ts` splits into pure parsers (`specDocChanges`, `indexInfoLines`) + one runner-driven `buildSnapshot`; each ≤50 lines |
| Pass A — errors as values | Bites | every git step returns `Result<T>` (`core/result.ts`, lifted from `pr/gh.ts:5`); commands turn `ok:false` into a line, never throw |
| Pass A — boundaries (wrap third-party) | Bites | git is the third party; `core/git.ts` is the one wrapper (cwd + env), mirroring `pr/gh.ts` being the only gh caller |
| Pass B — dependency rule | Bites | `publish/*` depend on `core/` only; `commands/` adapters read settings and call in; nothing in `core/` imports `publish/` |
| Pass B — humble object | Bites | `commands/push.ts`, `commands/publish-docs.ts` stay ≤20 lines like `commands/pr-status.ts` |
| Pass C — SRP | Bites | push (branch to its own ref) and publish (docs to default) are separate actors/modules; `remote-line.ts` renders for both |
| Pass C — OCP / LSP / ISP | Inert | |
| Pass C — DIP | Bites | `Runner` already the port (`core/run.ts:15`); tests use real git via `systemRunner` + a wrapping runner, no new port |
| Pass D | Skipped | tooling, no domain model |

## Guard blindness

- `tests/commands-table.test.ts:5-8` checks usage starts with the name — sees new entries. Fine.
- `tests/skill-wiring.test.ts:34` counts hooks only; nothing checks that mode files mention a command that exists. Not this phase's to fix.

## Seam and testability (deltas from recon)

- Tests must write `.gitattributes` (`docs/specs/**/INDEX.md merge=union`) in the fixture repo — this repo has none, and `merge-tree` honours attributes from the merged trees.
- None of the new files is near a cap; `spec.ts` gains two table rows.

## Amendments

1. Add `README.md` to Files to touch.
2. `merge-tree` exit 1 → conflict (names files); other non-zero → error with stderr + "needs git ≥ 2.38".
3. Merge-back failure after a successful publish → report both facts and the `git merge <X>` command; exit text, not throw.
4. Test: publish after merging main that already holds another spec's snapshot is clean.
5. `publish-docs` pushes the branch first; handoff §3 = `publish-docs <spec>` when `docs: main`, else `push`. Ledger decision + technical.md row.

## Decisions for you

None.
