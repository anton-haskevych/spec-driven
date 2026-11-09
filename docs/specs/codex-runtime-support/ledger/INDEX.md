# Ledger Index (layout v1)

## Gotchas

- `gotcha-native-install-evicts-previous-cache.md` — [phase 1, phase 4, phase 5, phase 6] — native old-path shell execution fails after update; model/trusted retention route unproved

- `gotcha-native-interrupt-needs-terminal-cleanup.md` — [phase 1, phase 3, phase 6] — interrupt acknowledgement does not prove yielded descendants stopped

- `gotcha-bun-docs-exceed-installed-api.md` — [general] — verify current Bun docs against the installed API and keep socket cleanup bounded

- `gotcha-codex-session-launch-needs-worktree-and-boot.md` — [general] — explicit native cwd, reviewed spec snapshot and self-contained boot before Codex launch

- `gotcha-old-readers-ignore-runtime-claims.md` — [phase 2+] — Older Claude readers cannot safely judge Codex claims

## Principles

- `principle-unknown-never-means-free.md` — [general] — Unknown evidence cannot release work

## Decisions

- `decision-deliver-value-incrementally.md` — [general] — build adapters now; gate activation on feature-specific proof

- `decision-use-native-updates.md` — [phase 1, phase 4, phase 5, phase 6] — native updates with fresh-session recovery; seamless old-session continuity deferred

- `decision-plugin-updates-preserve-session-versions.md` — [phase 1, phase 4, phase 5, phase 6] — old sessions retain loaded versions; fresh sessions use the updated install without a blanket wait-for-all rule

- `decision-runtime-boundaries.md` — [general] — One workflow, adapters at runtime boundaries
- `decision-source-based-immutable-releases.md` — [phase 5+] — Release behavior belongs in versioned artifacts
