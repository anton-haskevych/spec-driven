# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-fast-tier-git-leaks-through-production-defaults.md` — [phase 1+] — default `systemRunner` runs git unseen; the tripwire catches it
- `docs/specs/_ledger/gotcha-bun-scan-imports-needs-the-right-loader-and-no-shebang.md` — [general] — scanImports: strip shebang, loader by extension, skip JSON

## Principles
- `principle-real-git-tests-run-per-commit-while-seams-move.md` — [phase 3, 3a, 4–8] — per commit: test:fast + covering .git files
- `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md` — [general] — real git only for code that runs git; *.git.test.ts on a shrinking list

## Domain

## Decisions
- `decision-git-seams-bundle.md` — [phase 3+, load-bearing] — one GitSeams bundle; ports never resolve the branch
- `decision-lesson-enforced-by-guard.md` — [phase 1] — Anton: the real-git lesson carries enforced-by (house rule)

## Workarounds
