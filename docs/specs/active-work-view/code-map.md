# Code Map — Active Work View

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/focus/land.ts` | Base-first writer: pin, commit one `CLAUDE.md` onto the tip, push, retry | 2 |
| `skills/spec/tools/focus/rank.ts` | Pure rank arithmetic (append, top, after; never renumbers) | 2 |
| `skills/spec/tools/board/attribution.ts` | Session → spec: repo scope, claim → launch title → non-main tree | 3 |
| `skills/spec/tools/board/focus.ts` | `focusLane`: FOCUS rows + `otherSessions` | 3 |
| `skills/spec/tools/launch/title.ts` | Launch title builder and its inverse | 1 |
| `skills/spec/tools/board/people.ts` | `samePerson`, `personKey`, `focusFor` (`--who`) | 4 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/core/spec-meta.ts` | `SpecMeta.focus` / `owner`; the board reads `node.meta.focus` | `decision-focus-rank-in-spec-meta` |
| `skills/spec/tools/core/frontmatter-patch.ts` | `setFrontmatterLine` + new `removeFrontmatterLine` | |
| `skills/spec/tools/publish/snapshot.ts`, `publish/publish.ts` | `pinDefault`, `commitOnto` (extracted), `NON_FAST_FORWARD` | `decision-focus-writes-land-on-default-branch` |
| `skills/spec/tools/board/lanes.ts` | `buildBoard`; the FOCUS lane is one call here; sets `ReadyRow.focus` | |
| `skills/spec/tools/board/model.ts` | Board JSON; additive fields keep `BOARD_VERSION` 1 | |
| `skills/spec/tools/board/render.ts` | `LANES`, header, needs-you copy | |
| `skills/spec/tools/board/joins.ts` | IN FLIGHT session/PR joins (unchanged); exports `toPrCell`, `linkedPrs` | |
| `skills/spec/tools/board/attention.ts` | Needs-you kinds (`idle-claim`) | |
| `skills/spec/tools/board/rank.ts` | `rankReady`: focus first | |
| `skills/spec/tools/sessions/live.ts` | Only reader of `~/.claude/sessions/*.json` (every repo on the machine) | `principle-session-attribution-scope-and-order` |
| `skills/spec/tools/claims/held.ts` | `claimContext` lists every worktree path; the repo scope reuses that read | |
| `skills/spec/tools/pr/gh-lists.ts` | `gh pr list` fields (`author`) | |
| `skills/spec/tools/commands/list.ts` | `list` routing and the `--local` bug | |
| `skills/spec/tools/commands/context.ts` | `OFFER_TOP_READY` follows `rankReady` | |

## External references

- `docs/specs/spec-board/` — the board's spec, design decisions and ledger
- `~/.claude/sessions/<pid>.json` — undocumented Claude Code session files
