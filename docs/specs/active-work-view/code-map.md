# Code Map — Active Work View

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/focus/land.ts` | Base-first writer: pin, commit one `CLAUDE.md` onto the tip, push, retry | 2 |
| `skills/spec/tools/focus/rank.ts` | Pure rank arithmetic (append, top, after); **deleted in phase 7** when `focus:` became a band | 2 |
| `skills/spec/tools/focus/plan.ts` | Pure: the one `CLAUDE.md` edit (or refusal) for add / move / drop; takes a band since phase 7 | 2, 7 |
| `skills/spec/tools/commands/focus.ts` | `spec.ts focus add\|drop\|move`: args, copy | 2 |
| `skills/spec/tools/publish/commit-onto.ts` | `commitOnto`: index-info entries onto a base via a scratch index (snapshot + focus) | 2 |
| `skills/spec/tools/board/attribution.ts` | Session → spec: repo scope, claim → launch title → non-main tree | 3 |
| `skills/spec/tools/board/focus.ts` | `focusOrder` (one order for lane + `ReadyRow.focus`), `focusLane`: rows, `now`, sessions, `otherSessions` | 3 |
| `skills/spec/tools/board/render-focus.ts` | FOCUS lane text; `render.ts` only places it | 3 |
| `skills/spec/tools/tests/board-no-focus-golden.test.ts` | Golden: `renderBoard(buildBoard(...))` with no `focus:` = 2.36.7 | 3 |
| `skills/spec/tools/launch/title.ts` | Launch title builder and its inverse | 1 |
| `skills/spec/tools/sessions/by-workspace.ts`, `sessions/label.ts` | Every session per tree; `name ?? session <id8>` | 1 |
| `skills/spec/tools/board/deploy-waits.ts` | `{ waiter, target }` row-key pairs for undeployed needs | 1 |
| `skills/spec/tools/core/age.ts` | `olderThanDays` (strict) for remote and idle claims | 1 |
| `skills/spec/tools/board/people.ts` | `samePerson`, `personKey`, `focusWork` (who buckets), `focusFor` / `boardFor` (`--who`) | 4 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/core/spec-meta.ts` | `SpecMeta.focus` (a band since phase 7) / `owner`; the board reads `node.meta.focus` | `decision-focus-rank-in-spec-meta`, `decision-focus-is-a-band` |
| `skills/spec/tools/core/frontmatter-patch.ts` | `setFrontmatterLine` + new `removeFrontmatterLine` | |
| `skills/spec/tools/publish/snapshot.ts`, `publish/publish.ts` | `pinDefault`, `NON_FAST_FORWARD` (exported) | `decision-focus-writes-land-on-default-branch` |
| `skills/spec/tools/mainline/load.ts` | `baseProject(git, sha)`: spec docs at a sha from the base cache (board + focus writer) | |
| `skills/spec/tools/board/lanes.ts` | `buildBoard`; the FOCUS lane is one call here; sets `ReadyRow.focus` | |
| `skills/spec/tools/board/model.ts` | Board JSON; additive fields keep `BOARD_VERSION` 1 | |
| `skills/spec/tools/board/render.ts` | `LANES`, header, needs-you copy | |
| `skills/spec/tools/board/joins.ts` | IN FLIGHT session/PR joins (unchanged); exports `toPrCell`, `linkedPrs` | |
| `skills/spec/tools/board/attention.ts` | Needs-you kinds (`idle-claim`) | |
| `skills/spec/tools/board/rank.ts` | `rankReady`: focus first | |
| `skills/spec/tools/sessions/live.ts` | Only reader of `~/.claude/sessions/*.json` (every repo on the machine); `nameSource`, `updatedFrom` | `principle-session-attribution-scope-and-order` |
| `skills/spec/tools/claims/held.ts` | `claimContext` lists every worktree path (its own read) | |
| `skills/spec/tools/board/load.ts`, `board/inputs.ts` | `BoardInputs.worktreePaths`: every `git worktree list` path (repo scope) | `gotcha-session-files-span-every-repo` |
| `skills/spec/tools/pr/gh-lists.ts` | `gh pr list` fields (`author`) | |
| `skills/spec/tools/commands/list.ts` | `listRoute`: board vs table, `--local` (fixed in phase 1) | |
| `skills/spec/tools/portfolio/rows.ts` | `specSummary`: progress, priority, due, overdue per spec node | |
| `skills/spec/tools/board/phase-keys.ts` | `rowKey` / `splitKey` (inverse pair) | `domain-whole-spec-deploy-refs-never-wait` |
| `tests/factories.ts`, `tests/board-factories.ts` | Shared `claim`, `heldClaim`, `liveSession`, `prRow` | |
| `skills/spec/tools/commands/context.ts` | `OFFER_TOP_READY` follows `rankReady` | |

## External references

- `docs/specs/spec-board/` — the board's spec, design decisions and ledger
- `~/.claude/sessions/<pid>.json` — undocumented Claude Code session files
