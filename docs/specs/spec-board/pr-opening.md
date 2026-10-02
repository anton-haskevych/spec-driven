# PR Opening — Spec Board

## Spec state

PR A (phases 1–3) merged as #8 and shipped in 2.35.0 on 2026-10-01 (cold timing 3.3 s accepted). PR B (phases 4–6) on branch `feat/spec-board-pr-b`, PR #9 (https://github.com/anton-haskevych/spec-driven/pull/9): phase 4 done (CRM warm 2.3 s with gh and sessions); phase 5 done (claims: store, command, packs, board, execute/handoff wiring); 5a done (remote claims as refs on origin, `--take-over`, board); 5b done (`trees place`, setup, personal root, `trees prune`, board targets; execute §1 places before claiming); 6 done (`launch execute <spec> <phase>` via placement, *Next sessions* endings, context-first no-spec rule). All phases done: PR B gate next.
Split (value first):
- **PR A: phases 1–3.** Board from main, workspace scan, in-flight overlay. Phases 1 and 2 can run in parallel. Release 2.35.0.
- **PR B: phases 4–6.** PRs and sessions, claims (local + remote, 5a), loop wiring. Release 2.36.0.

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin repo PRs are ready, not draft — never straight to `main`.

PR A:
- [x] `bun test` passes (all suites, including `commands-table.test.ts`, `skill-wiring.test.ts`, `portfolio.test.ts`) — 523 pass, 2026-10-01
- [x] `bun run typecheck` clean
- [x] `bun install --frozen-lockfile` clean (no new runtime deps)
- [x] `python3 scripts/version.py` — all version declarations match (2.34.0); bump to 2.35.0 at release
- [ ] Smoke in CRM: `spec.ts list` from the main checkout and from one worktree print the same board except `◀ here`; time it cold and warm (target < 3 s without gh) — same board ✓; warm 2.2 s ✓; **cold 3.3 s ✗** (fetch 0.6 s + archive 0.7 s + scan 0.9 s + loaders 0.6 s)
- [x] Smoke offline (no network): header says offline, board renders; `spec.ts list blocked` and `list <words>` still print the table — 2.2 s offline; table output identical to 2.33
- [x] Smoke: a phase ticked only in a worktree shows in flight, and its dependent shows `in <workspace>`, not ready from main — CRM double-charge-proof-checkout 4–10 in flight, 11 ready `in double-charge-proof-checkout (needs 10, ticked there)`
- [x] `list.md` no-Bun fallback still describes the table; README + SKILL.md *Tools* updated; ROADMAP row

PR B:
- [x] `bun test`, `bun run typecheck`, frozen lockfile, `version.py` as above — 724 pass, tsc clean, lockfile unchanged, 2.36.0 everywhere (2026-10-01)
- [x] Smoke in CRM: PR and session cells match `gh pr list` and the open sessions; total < 5 s — 4.71 s; #848 draft matches gh; `page-seo-check` busy matches a live claude process there
- [x] Smoke: two sessions `claim take` the same phase — one wins, the other gets the holder's name; same for a takeover of a closed claim; handoff releases — scratch clone with a bare local origin, spec-loop-automation 10
- [x] Smoke on GitHub with two clones: the second clone's take is refused with `user@host`; `--take-over` wins and prints the branch; the first clone's release says `taken over by`; the board in each clone shows the other's claim as `remote <age>` — first run: clone 1 still showed its own stale file; fixed (`withoutTakenOver`), re-run green; refs cleaned
- [x] Smoke: with `~/.claude/sessions` made unreadable, session cells say `unknown` and no claim is taken over — `CLAUDE_CONFIG_DIR` with a chmod 000 `sessions/`; dead claim refused, cell `unknown`
- [ ] `launch execute <spec> <phase>` from iTerm: a row whose tree exists opens there; a fresh row gets a tree from `trees place` (fresh `origin/<default>`); both run execute on that phase and claim it
- [x] Every mode-file tool step touched has a no-Bun fallback line; README, SKILL.md, ROADMAP row — added the missing ones to handoff's release and execute §0.2
