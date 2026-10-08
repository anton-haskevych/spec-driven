# Code Map — Active Work View

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/board/lanes.ts` | `buildBoard`; the FOCUS lane is one call here | |
| `skills/spec/tools/board/model.ts` | Board JSON; additive fields keep `BOARD_VERSION` 1 | |
| `skills/spec/tools/board/render.ts` | `LANES`, header, needs-you copy | |
| `skills/spec/tools/board/joins.ts` | Session/PR joins onto flight rows | |
| `skills/spec/tools/board/attention.ts` | Needs-you kinds (idle claim, shipped focus) | |
| `skills/spec/tools/sessions/live.ts` | Only reader of `~/.claude/sessions/*.json` | |
| `skills/spec/tools/mainline/load.ts` | Base-branch loaders; focus entries load here | |
| `skills/spec/tools/pr/gh-lists.ts` | `gh pr list` fields (`author`) | |
| `skills/spec/tools/commands/list.ts` | `list` routing and the `--local` bug | |

## External references

- `docs/specs/spec-board/` — the board's spec, design decisions and ledger
- `~/.claude/sessions/<pid>.json` — undocumented Claude Code session files
