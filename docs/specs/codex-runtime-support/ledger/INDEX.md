# Ledger Index (layout v1)

## Gotchas

- `gotcha-pilot-cwd-aliases.md` — [phase 2, phase 2b] — resolve competitor cwd before judging occupation

- `gotcha-native-install-evicts-previous-cache.md` — [phase 1, phase 2, phase 4, phase 6] — native old paths can disappear; use fresh-session recovery
- `gotcha-native-interrupt-needs-terminal-cleanup.md` — [phase 1, phase 3b, phase 6] — interrupt acknowledgement does not prove descendant cleanup
- `gotcha-bun-docs-exceed-installed-api.md` — [general] — verify installed Bun APIs and bound socket cleanup
- `gotcha-codex-session-launch-needs-worktree-and-boot.md` — [general] — verify native cwd and actual candidate boot context
- `gotcha-old-readers-ignore-runtime-claims.md` — [phase 2+] — old Claude readers cannot safely judge Codex claims

## Principles

- `principle-claim-projection-is-not-a-write-model.md` — [phase 2, phase 2b, phase 3b, phase 6] — preserve raw documents separately from policy projections
- `principle-unknown-never-means-free.md` — [general] — unknown evidence cannot release work

## Decisions

- `decision-deliver-value-incrementally.md` — [general, load-bearing] — useful increments now; full parity and Claude behavior remain required
- `decision-native-host-updates-only.md` — [general] — native hosts own updates; Phase 5 stays withdrawn
- `decision-use-native-updates.md` — [phase 1, phase 2, phase 4, phase 6] — native updates with fresh-session recovery; no custom retention
- `decision-plugin-updates-preserve-session-versions.md` — [phase 1, phase 4, phase 5, phase 6] — superseded release requirement; retain historical evidence
- `decision-runtime-boundaries.md` — [general] — one shared workflow, adapters at native boundaries
- `decision-source-based-immutable-releases.md` — [general] — source-contained native assets; existing release mechanisms only
