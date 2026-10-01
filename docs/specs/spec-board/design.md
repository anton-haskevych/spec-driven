# Spec Board — Design

## Problem

Anton runs several specs in parallel sessions and worktrees. Which phase is where, what can start, what
waits on what, and which PR belongs to which spec lives in his head or is rebuilt by hand per chat
(2026-10-01: four shell commands and a long table to answer "what next and how do these relate").
Three gaps in the tools (`research/2026-10-01-wave-1-sources-and-layers.md`):

- **One checkout only.** Every view reads the folder it runs in. From a worktree branched days ago, it
  shows days-old progress and nothing other worktrees ticked.
- **No cross-spec "what next".** `list` is a flat table (CRM: 30 open, 14 p1). The ready set exists
  only per spec.
- **No session, claim or PR picture.** Nothing says a phase is taken, which session is on it, or
  which PR and CI state go with it. Two sessions can pick the same phase.

## Decisions

| # | Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|---|
| 1 | Where the board lives | Default output of `list`; `list table` keeps today's table; lane names filter one lane uncapped | A new `/spec board` sub-command | Agentic-only: no new user-facing command; keeping it in `list` also avoids the new-sub-command wiring tests |
| 2 | Layers | Source adapters (IO) → `BoardInputs` (plain data) → `buildBoard` (pure) → `Board` (versioned, serializable) → views | Render straight from sources, as `list` does today | A later HTML view consumes `Board` (or `--json`) with nothing underneath rebuilt; the pure middle is where the logic is, and it's tested without git |
| 3 | Folder shape | One domain folder per source that has its own consumers (`workspaces/`, `sessions/`, `claims/`; PRs extend `pr/`) + `board/` for model, rules and views; flat, no subfolders | (a) everything in one `board/`; (c) `board/sources|model|views/` subfolders | Claims are also used by execute and handoff, workspaces by the board and later by inference; `principles.md` §10 groups by what changes together, and no folder in tools has subfolders |
| 4 | Truth for spec docs | Base = `origin/<default>` tree read from git blobs; overlay = each live worktree's spec docs on disk (committed and uncommitted) | (i) The cwd checkout (today); (ii) `git archive` to a temp dir | (i) is the bug; (ii) CRM's spec roots are 501 MB on main, and blobs cost 0.15 s with no disk |
| 5 | Reading specs without a folder | Additive `loadNodeFrom(spec, read)` / `specsFromPaths(paths)` beside the disk versions | Change `loadNodes` / `listSpecs` signatures | ~25 call sites untouched; writers stay disk-only |
| 6 | Freshness | `git fetch --quiet origin <default>` every board run, 10 s timeout; offline or lock error → board from the local ref, header says so | `ls-remote` first, fetch only if stale; never fetch | Local `origin/main` was already stale in the probe; a fetch that has nothing to do costs about the same as `ls-remote` |
| 7 | Which worktrees are scanned | One `for-each-ref` (ahead-behind) + one `rev-list` for detached HEADs; merged-and-clean are counted, not scanned; no-merge-base (shallow) shown as "unknown base" | Scan all; per-worktree `merge-base` | CRM: 43 of 64 skipped; 21 scanned in parallel in ~0.6 s |
| 8 | Parallel git | New `AsyncRunner` beside the sync `Runner`; used only by the workspace scan, concurrency 8 | Make `Runner` async | `Runner` is sync in 9 modules; only this scan needs parallelism |
| 9 | Session liveness | `~/.claude/sessions/<pid>.json` (sessionId, cwd, status, updatedAt) + pid alive | Process cwd via `lsof`; transcript tails; heartbeats in claims | Session files name the session and its state directly; process cwd is the start dir; transcripts are MBs and move with `cd` |
| 10 | Phase claims | JSON per claim in `<git-common-dir>/spec-board/claims/`, exclusive create; a claim is live while its session is open; execute takes, handoff releases | Commit a claim file; branch-name mapping; time-based expiry | Shared by every worktree instantly, never committed, survives `gc` and `worktree prune` (probed); session state replaces guessed timeouts |
| 11 | Claim identity | `CLAUDE_CODE_SESSION_ID` from the Bash env, worktree from `git rev-parse --show-toplevel` at claim time | `${CLAUDE_SESSION_ID}` skill substitution | Substitution works only in SKILL.md, not in `execute.md`; the env var is in every Bash call |
| 12 | PRs | Two `gh pr list` calls: open with `statusCheckRollup` (1.6 s), all states without it (0.7 s); joined by branch and by `pr-opening.md` links | One `--state all` with rollup (8.4 s); `pr-status` per PR | Speed and the 30-call budget; merge conflicts (`mergeable` is `UNKNOWN` in lists) stay `pr-status`'s job |
| 13 | CI state | `rollupToChecks` maps CheckRun/StatusContext into the existing buckets, then `summarizeChecks` | A second classifier | One place decides pass/fail; external-check globs apply the same way |
| 14 | Ready ranking | Overdue → priority → due → unblocks most → updated → name; shared `compareSchedule` with `list` | `orderSpecs` as is | `orderSpecs` keys are spec-level; "unblocks most" breaks ties between many p1s |
| 15 | Safe-to-run mark (★) | No `same-files-as` with an in-flight phase and no shared non-hub code-map path with an in-flight spec; overlap is a warning, never a block | Block overlapping work | Overlap means merge risk, not a dependency; `HUB_LIMIT` keeps shared hubs from marking everything |
| 16 | Wiring | execute §1 claims (resume enters at §1); handoff releases and ends with the board's top 3 ready + needs you; resume adds a neighbor line; `launch` takes a phase hint | A hook that claims on file edits | Claims mean "I picked this phase", which only execute knows |

## Layers

```
 sources (IO, injected)                    model (pure)                      views
 ─────────────────────                     ────────────                      ─────
 mainline   git fetch + ls-tree/cat-file ─┐
 workspaces worktree list, ahead-behind,  │
            per-worktree spec-doc changes ├─► BoardInputs ─► buildBoard ─► Board (v1) ─┬─► renderBoard (terminal)
 sessions   ~/.claude/sessions/*.json     │   plain data     overlay        lanes,     ├─► list --json
 claims     <git-common-dir>/spec-board/  │                  lanes, rank    rows,      └─► (later) HTML
 prs        gh pr list ×2                ─┘                                 header
```

`loadBoardInputs` is the only function that touches git, gh or disk. Everything right of it is pure
and tested with typed factories.

## The board

Example from CRM data (PR numbers and states invented to show each lane):

```
spec board · crm · origin/main e43d948 · fetched 13:40
4 in flight · 7 ready · 11 blocked · 3 need you

IN FLIGHT
  alert-noise-cleanup · 8 (PR D)     alert-noise-cleanup-pr-d ◀ here   busy 2m    —                executing
  alert-noise-cleanup · 4 (PR B)     alert-noise-cleanup-pr-b          idle 3h    #881 draft ✗ 2   fix CI
  double-charge-proof-checkout · 4   double-charge-proof-checkout      closed     #861 ✓           merge
  ci-optimization · 12               ci-optimization-phase-12          —          —                ticked on branch, not merged

READY   ★ = shares no files with anything in flight
  1 ★ user-facing-error-messages        /spec prep      p1  10-14  unblocked by alert-noise-cleanup#2
  2 ★ alert-noise-cleanup · 5 (PR C)    /spec execute   p1  10-14
  3   explicit-charge-handling · 1      /spec execute   p1  10-14  shares files with alert-noise-cleanup
  4 ★ permission-aware-ui · 2           /spec execute   p1  10-14  unblocks 2
  +3 more → /spec list ready

BLOCKED
  alert-noise-cleanup · 7               needs phase 4 deployed
  recurring-series-lifecycle-clarity · 3   needs schedule-lifecycle-safety#2
  +9 more → /spec list blocked

NEEDS YOU
  #861 checks pass → merge              double-charge-proof-checkout
  #881 2 checks failing → fix           alert-noise-cleanup (PR B)
  claim by a closed session             double-charge-proof-checkout · 4 → resume or release
  ⚠ overdue: tickets-lifecycle-recovery (due 09-28)

43 worktrees merged · 4 unknown base · 27 backlog ideas → /spec list table
```

### Rows

- **In flight** row: `<spec> · <phase> (PR <group>)`, workspace name (basename of the worktree path;
  `main checkout` for the main one), session (`busy|idle <ago>`, `closed`, or `—`), PR cell
  (`#<n>[ draft] ✓|✗ <failing>|… <pending>`, `—`), next (`executing`, `fix CI`, `merge`,
  `ticked on branch, not merged`, `uncommitted`).
- **Ready** row: rank, ★ or blank, `<spec> · <phase>` (or the spec alone when it has no phases),
  next command, priority, due (`MM-DD`, `⚠ overdue`), note (`unblocked by …`, `unblocks N`,
  `shares files with …`, `only on <branch>`).
- **Blocked** row: `<spec> · <phase>`, the readySet reasons joined by `; `.
- **Needs you** row: what, then which spec, then the action.

### Next step per stage

| Stage of the spec / phase | Next |
|---|---|
| Prep stub, no `product-brief.md` (or a `seed.md`) | `/spec prep <spec>` |
| Brief, no `progress.md` | `/spec create <spec>` |
| Open phase, ready | `/spec execute <spec> <phase>` |
| All phases ticked, no PR linked | open PR (`pr-opening.md`) |

### States and copy

| State | Output |
|---|---|
| Fetch failed | header `· offline, origin as of <sha> <date>` |
| `gh` missing / unauthenticated | PR cells `?`, footer `PRs unavailable: <reason>` |
| Called from a worktree | `◀ here` on its row; nothing else changes |
| No worktrees besides main | lanes as usual; footer omits the worktree counts |
| Empty lane | lane heading with `none` |
| Same phase ticked in two worktrees | in flight, note `ticked in 2 worktrees: a, b` |
| Spec only on a branch | ready / in flight with `only on <branch>` |
| Not a git repo, or no Bun | `list` prints today's table (`list.md` §2 fallback) |

## Flows

**Picking work.** `/spec list` → board. "Start 1 and 2" → Claude runs
`spec.ts launch execute <spec> <phase>` per row → each tab runs execute → execute §1 claims.

**Claim race.** Two sessions run `claim take` on the same phase: exclusive create lets one win; the
other gets `claimed by <session name> in <worktree>` and picks the next ready phase.

**Closing.** Handoff → `claim release` → final block shows the board's top 3 ready and needs you.

**Abandoned session.** Its session file is gone, the phase isn't done → needs you:
`claim by a closed session`. Execute on that phase takes the claim over and says so in one line.

## Edge cases

- Shallow clone: branches with no merge base are counted as "unknown base", never diffed (`log` gives
  junk, `diff` fails).
- A worktree folder that's gone (`prunable`) is skipped; its claims are dropped on the next run.
- Pointers outside `phases/` (`../ci-optimization/…`) resolve inside the repo; anything escaping the
  repo is ignored.
- The main checkout is a workspace too: its uncommitted spec docs overlay like any other.
- Subagents share the parent's session id, so a subagent never claims separately.
- Codex worktrees are listed and scanned as workspaces; their sessions show `—`.
