# spec-driven — Cross-Spec Roadmap (v2.21 → v2.27)

Source: research across 30 recent CRM Dance specs plus counts over all 265
(2026-09-23). Visual plan: https://claude.ai/artifact/LnumkQcRdkxDYsk4Lu9dvR

The loop inside one spec works. The failures happen between specs: lessons stay
locked in one spec's ledger (986 `[general]` entries, the same gotchas found 3–8
times), relations between specs live in prose (368 links, 0 structured), and the
next step is picked linearly.

## Rules for every release

- **Agentic only.** The user's interface stays `/spec prep | review | execute | handoff`.
  Tools run from a mode's flow or from hooks declared in `skills/spec/SKILL.md`
  frontmatter. Those hooks register only when `/spec` is invoked, so a session
  without `/spec` gets zero extra context.
- **One fresh session per chunk.** No compaction, no SessionStart hook, no
  branch-to-spec mapping. Hooks key on file paths.
- **Bun + TypeScript, zero dependencies.** `Bun.YAML` parses frontmatter and
  `Bun.Glob` matches paths. Tools live in `skills/spec/tools/` and are addressed as
  `${CLAUDE_SKILL_DIR}/tools/…`.
- **Fail open.** Hooks and injected commands always exit 0. A failing injected
  command would abort the skill, so errors print a fallback line instead.
- **Degrade gracefully.** Codex and cloud sessions don't run skill hooks or `!` commands;
  every flow keeps its manual read path as the fallback.
- **Each release builds on the last** and is published: version bump → push →
  marketplace sync → Codex refresh.

## Releases

All shipped 2026-09-24. 2.27.1 fixed the skill hooks' script path (`${CLAUDE_SKILL_DIR}` is empty inside hook commands; they use `$CLAUDE_PLUGIN_ROOT`). Both hooks and the context pack are verified in live Claude Code sessions.

| Version | Change | Builds on |
|---|---|---|
| 2.21.0 | **Foundation.** Bun tool core, `doctor`, spec-file check hook (PostToolUse), session-lifecycle section, stage derived from files so `status` only holds values the project allows | — |
| 2.22.0 | **Context pack.** `resume`/`execute`/`review` start with the exact context injected at skill load | 2.21 core |
| 2.23.0 | **Project ledger.** `_ledger/` with `paths:` + `seen-in:`, promote/dedupe on write, recall by path (PreToolUse hook + context pack + prep + review) | 2.21, 2.22 |
| 2.24.0 | **Spec graph.** `part-of / needs / supersedes / related` frontmatter, computed reverse links, stale/dangling/overlap checks, prep overlap wave, review neighborhood, "blocked by" in the pack | 2.21–2.23 |
| 2.25.0 | **Phase edges + ready set.** Phase frontmatter `needs / needs-deployed / same-files-as / pr`, computed parallelism, ready set replaces "first unchecked phase" | 2.24 |
| 2.26.0 | **Guards.** `enforced-by:` on lessons; lessons seen in 3+ specs become graduation candidates surfaced in review | 2.23 |
| 2.27.0 | **Playbook.** Named gate blocks for `pr-opening.md`, phase archetypes, fixed research names | 2.24 |

## Next: specs as the tracker (2.28 → 2.30)

Plan: https://claude.ai/artifact/MuwvKTZM6Tnnxqvjsqijbi. The plugin stays development-first and domain-free; projects add their own kinds of work through playbooks.

| Version | Change | Status |
|---|---|---|
| 2.28.0 | **Backlog and list view.** `_backlog/` ideas, `/spec idea`, `spec.ts list` (priority, due, JSON), optional priority/due on specs and phases, thin sub-command skills for the `/spec` menu | shipped |
| 2.29.0 | **Task phases.** `code: false` on a phase: no TDD or PR gate, ticked with evidence; guard against QA/PR phases | shipped |
| 2.30.0 | **Tag playbooks.** `_playbook/<name>.md` with `match:` on taxonomy values, injected into the context pack | shipped |

Next, outside the plugin: CRM adds a `growth` domain, `docs/specs/_playbook/growth.md`, and points `/growth` at specs instead of Linear.

## Loop automation (2.31 → 2.33)

Shipped together as 2.33.0 on 2026-10-01 (PRs #3, #6).

Spec: `docs/specs/spec-loop-automation/`. A read of 52 CRM sessions found the loop's routine chores rebuilt by hand in session after session. These releases move them into the plugin. Each command is named in the one mode step that uses it, and hand edits stay allowed: a command earns its place only by removing a repeated, observed failure.

| Version | Change | Status |
|---|---|---|
| 2.31.0 | **Context pack always loads.** `execute`, `execute phase15`, `my-spec.` and `x phase 2 execute` parse the same in the tool and in SKILL.md; an unnamed `execute`/`resume`/`status` uses the one spec the branch's changed files belong to | shipped (in 2.33.0) |
| 2.32.0 | **Spec-file writers.** `spec.ts phase tick\|deployed\|add\|split` and `lessons add`, each validated before it writes | shipped (in 2.33.0) |
| 2.33.0 | **Project settings and remote.** `_playbook/settings.md` (docs home, draft or ready, merge method, external checks, after-merge and bootstrap gates), `.gitattributes` union for INDEX files, `pr-status`, handoff runs `push` / `publish-docs`, and a plain-words Outcome line per phase | shipped |

Then CRM adopts it: settings, gates, `.gitattributes` (spec phase 10).

## Spin-off (2.34)

Shipped as 2.34.0 on 2026-10-01 (PR #7).

Spec: `docs/specs/spec-spin-off/`. Two CRM sessions on 2026-09-30 needed new specs mid-work and each improvised it: prepped inline on a full context, or wrote stub briefs that dropped the user's words, the rejected options and what the parent needed.

| Version | Change | Status |
|---|---|---|
| 2.34.0 | **Spin-off.** A session that needs a new spec writes its `seed.md` (+ inherited wave 0), links it with `needs`, and `spec.ts launch prep <name>` opens a fresh session (iTerm tab, tmux, Terminal.app). Prep starts a seeded spec from the seed. Phase `needs: [<spec>]` resolves on a spec with no phases yet | shipped |

## Spec board (2.35 → 2.36)

2.35.0 shipped on 2026-10-01 (PR #8).

Spec: `docs/specs/spec-board/`. Parallel sessions across worktrees had no shared view of which phase is where, what can start and what waits on what. `/spec list` becomes a board of every open phase, the same from any checkout.

| Version | Change | Status |
|---|---|---|
| 2.35.0 | **Board.** `/spec list` shows lanes (in flight, ready, blocked, needs you) built from `origin/<default>` plus every worktree's unmerged spec docs; ready ranked, ★ when clear of work in flight, `in <worktree>` when a need is ticked only there; `spec.ts board [<lane>] [--json] [--local]` for agents | shipped |
| 2.36.0 | **PRs, sessions, claims.** PR and session cells, needs-you actions (merge, fix CI), phase claims (local and on origin) so parallel sessions don't pick the same phase, tree placement and prune, `launch execute <spec> <phase>` into the placed tree, *Next sessions* endings | shipped |
| 2.41.0 | **Per-commit gate.** Settings key `gates.per-commit` names the `gates.md` section a session runs after each unit (pack `Settings:` shows `each commit: gate <name>`; the doctor errors when the section is missing). Execute §6 runs that gate's lines for the subprojects touched and the affected slice elsewhere, never the full suite per commit: that belongs to the PR gate or CI. The green check stays mandatory | 2.40.0 |
| 2.40.0 | **Idle claims under needs you.** A session on this machine that holds a live claim and has been idle for 2+ days shows as `claim idle 3d · <spec> · <phases> → switch to <session> or take it over`, one row per session. Busy sessions, unreadable sessions and `--local` never flag anything; board-wide, focus set or not | 2.39.0 |
| 2.39.0 | **Focus bands.** `focus:` holds a MoSCoW band, `must`, `should` or `could`, instead of a rank: `spec.ts focus add|move <spec> <band>`, `focus drop <spec>`; `--top` / `--after` are gone. FOCUS prints MUST / SHOULD / COULD sub-headers and orders each band by overdue, due date, priority, name; a focus spec's ready row notes its band. A 2.37.0 number reads as `should` with a doctor warning | 2.38.0 |
| 2.37.0 | **Focus set and FOCUS lane.** A team's ranked focus set lives as `focus: <rank>` in each spec's `CLAUDE.md`; `spec.ts focus add|drop|move` commits it straight onto `origin/<default>`, one file per write. `/spec list` opens with a FOCUS lane: per focus spec, progress, what is happening now, and who is on it (this repo's sessions on this machine, a teammate's remote claims, open linked PRs by author). Focus specs rank first among ready rows; `board focus --who <name|me>` filters to one person. No `focus:` anywhere → the board is unchanged | 2.36.8 |
| 2.36.8 | **`list --local` shows the board.** `list --local` printed an empty table (the flag became the filter); it now prints the board without fetching, and an unknown `list --` flag prints usage. Groundwork for the focus lane: shared session label, sessions-per-tree, deploy waits, age, spec summary, PR cell and launch-title helpers, each with a test | 2.36.7 |
| 2.36.7 | **Publishing after merging main.** `publish-docs` bases its snapshot on the merge-base with main once the branch's last snapshot is already on main, so another spec's snapshot (or main's own spec edits) brought in by merging main no longer reads as this branch's change and no longer refuses as `diverged on main` | 2.36.6 |
| 2.36.6 | **Git failures say why.** A failed push reports git's `! [rejected] … (non-fast-forward)` line instead of the `To <remote>` line git prints first; other git failures report the first `fatal:` / `error:` line | 2.36.5 |
| 2.36.5 | **A running local stack doesn't hold the tree.** A session whose turn is over but whose background shell still runs (status `shell`) no longer blocks the next phase in its tree; unknown statuses still do | 2.36.4 |
| 2.36.4 | **Controller tabs check claims.** A session that handed off may stay open to answer and launch; before it writes in a tree again it runs `claim list`, and if another live session holds the tree it asks instead of writing. No guard hook until that failure recurs | 2.36.3 |
| 2.36.3 | **Launch keeps your place.** The iTerm launch writes into the tab it created (two launches at once no longer type into one tab), returns focus to the tab you were in, and reports `Launched: iTerm tab N (⌘N)`. tmux opens the window detached; Terminal.app stops activating itself | 2.36.2 |
| 2.36.2 | **A tree is held by work, not an open tab.** A session left open after its handoff no longer blocks the next phase in its tree; refusals name the reason (claim, mid-task, uncommitted changes). Prune still keeps any tree with a tab open, and every tree when sessions can't be read. The board knows its caller. One winner on a stale claim (per-claim lock) | 2.36.1 |
| 2.36.1 | **No project ledger INDEX.** `lessons add` stops writing `docs/specs/_ledger/INDEX.md`; prep, review and the doctor read the lesson files. GitHub's PR check ignores `merge=union`, so that one file made every spec PR conflict and skip CI | shipped |

## Adoption

No bulk backfill. The project ledger and spec relations fill in as specs go through
prep, execute and handoff: new codebase lessons get promoted, and new or resumed specs
declare their neighbors. Improve the plugin from what real use shows.
