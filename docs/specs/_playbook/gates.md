# Gates

Named check lists the `/spec` loop runs. `settings.md` names which gate runs when; `pr-opening.md` files reference
them as `gate: <name>`.

## per-commit

Runs after every green unit, before the commit. Seconds, no real git: the full suite belongs to `pre-pr` and CI.

- [ ] `bun run test:fast` passes and its git tripwire stays silent (every test except `*.git.test.ts`)
- [ ] Changed `record/`, `claims/`, `core/land-*`, `publish/`, `trees/` or `mainline/`? Also run the `*.git.test.ts` files that cover them (`bun test <name>.git`)

## pre-pr

- [ ] `bun test` passes (every file, real git included)
- [ ] `bun run typecheck` is clean
