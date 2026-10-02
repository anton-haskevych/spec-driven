---
needs: [5a]
pr: B
---

# Phase 5b — Tree placement

**Goal:**
- Each session starts in the right worktree: one tree per spec PR group, cut from a fresh
  `origin/<default>`, set up and runnable, and never shared with a live session.
- Spec-driven creates trees itself and no longer relies on `claude -w` and a personal hook. It works the
  same for Anton, Taras and any customer.
- A new person or device needs no config file and no setup step. The first placement detects where their
  trees live and records it.

**Outcome:** you never pick, create, set up or hunt for a worktree. The first session on Taras's machine
onboards him, and nobody sends a config file · tool + small doc changes · medium risk: it creates
branches and trees, though it never deletes unmerged work.

**Evidence** (research 2026-10-01, CRM transcripts 09-01..10-01):
- **The unit is a PR bundle.** "a worktree in which we will ship the B4+5+6 together… one draft PR" (09-11).
  Trees often carry a spec's later PRs too.
- **The base is always `origin/main`.** "based off the latest remote main" (said about 15 times). Sessions
  renamed the hook's `worktree-<name>` branches and later bypassed it with `git worktree add -b feat/X …
  origin/main`.
- **Fresh trees are broken until set up.** `@crm-dance/crm-api/internal` missing (about 230 errors); the
  same lesson is in 5 ledger entries.
- **Trees are lost after a restart.** "figure out where they are located… whether they have PRs" (09-27).
  64 CRM trees today: 35 with no commit in over a week; 117 before the 09-17 purge.
- **Everyone keeps trees somewhere different.** Taras uses Claude Code's in-repo `.claude/worktrees/` and has
  no hook. Codex and sibling clones use their own places. The WorktreeCreate hook silently reuses a tree
  name that already exists.

**Files to touch:**
- `skills/spec/tools/trees/` (new domain folder): `place.ts` (find-or-create), `local-settings.ts` (personal
  layer + detection), `prune.ts`; `commands/trees.ts`; `tests/trees*.test.ts`
- `skills/spec/tools/board/lanes.ts` (`phaseRow` target = PR-group tree; busy tree), `board/rank.ts` (★),
  `board/attention.ts` (prunable trees)
- `skills/spec/tools/playbook/settings.ts` (`worktrees.branch` only if a project needs another pattern; see below)
- `skills/spec/execute.md` (§0 placement before claim), `skills/spec/SKILL.md` (*Tools* → Trees), `README.md`
  (*Teammates*)

## Implementation guidance

**Placement** (`spec.ts trees place <spec> <phase> [--json]` → a tree path, or a refusal with a reason):
1. **Find.** Read `git worktree list --porcelain`, which covers every location: Codex, sibling clones,
   in-repo. Match on branch `feat/<spec>-<pr>`. When no branch matches, use the Phase 2 scan: the tree
   holding this spec's unmerged docs for the same PR group. The phase's `pr:` is lowercased; with no `pr:`,
   the name is `feat/<spec>`.
2. **Busy?** A live session's `cwd` in the tree (sessions source) or a live claim naming it → refuse with
   `after <spec> <phase> (<session>)`. Never two sessions in one tree.
3. **Take over.** No local tree, but `origin/feat/<spec>-<pr>` exists (Taras's branch, or another device) →
   `git worktree add <root>/<spec>-<pr> feat/<spec>-<pr>` tracking it. A remote claim still refuses unless
   it is stale (5a rules).
4. **Create.** `git fetch origin <default>`, then `git worktree add -b feat/<spec>-<pr> <root>/<spec>-<pr>
   origin/<default>`. This never goes through the WorktreeCreate hook, and never branches from local HEAD.
5. **Set up.** Copy the gitignored files `.worktreeinclude` lists (Claude Code's own format; fall back to
   `.env`, `.env.local`), then run the project's `gates.bootstrap` gate. On failure, keep the tree and
   report which step failed; the session starts there and fixes it.

**Shared vs personal settings:**

| Setting | Lives in | Default |
|---|---|---|
| Unit, base, branch `feat/<spec>-<pr>` | rule, not a setting | — |
| Setup gate | shared `docs/specs/_playbook/settings.md` → `gates.bootstrap` (exists today) | none |
| Tree root | personal `<git-common-dir>/spec-driven/local.md` (frontmatter `worktrees.root`) | detected |

- **The personal file sits inside `.git`.** So it's per clone and per device, never committed, and needs no
  `.gitignore` line. Same home as the claims (`<git-common-dir>/spec-board/claims/`).
- **Detection, on the first placement when the file is missing:**
  - Root = the parent folder holding the most existing trees, e.g. Anton → `~/claude-worktrees/crm` (52 of
    64), Taras → `<repo>/.claude/worktrees`.
  - No trees yet → `~/claude-worktrees/<repo>`: outside the repo, which avoids Node resolution and
    nested-checkout trouble (the reason Anton's hook exists).
  - Write the file and print one line: `Trees: <root> (detected from N trees; say "put my trees in X" to change)`.
- **Changing it is agentic.** Claude rewrites the file when the user asks. No new user command.
- **Add no other keys** (parallel cap, branch pattern, terminal) until a person actually needs one.
  `launch/terminal.ts` already detects iTerm, tmux or Terminal.

**Onboarding a teammate or customer.** Nothing to send. Shared rules arrive with `git pull`, and the
personal layer is detected. README *Teammates* holds what their agent needs to know: needs Bun and the
plugin; where the shared settings live; what was detected and how to change it; that the WorktreeCreate
hook is optional and only used by plain `claude -w`.

**Cleanup.** `trees prune` lists trees whose branch is merged into `origin/<default>`, has no unpushed
commits, is clean, and has no live session. The board's *Needs you* shows `prune N merged trees`; Claude
runs `trees prune --apply` after the user says yes. Anything unmerged, dirty or unpushed is never touched.

**Board.** A row's target becomes its PR group's tree: an existing workspace, or `new: <root>/<spec>-<pr>`.
A row whose tree is busy loses ★ and shows `after <spec> <phase>`. This fixes `board/lanes.ts:125`, which
names one tree per phase. Academy 2, 8 and 9 (`pr: A`, `needs: []`) would otherwise become 3 branches for
one PR.

## Deliverables

- [ ] `trees place`: find by branch, then by scan; refuse a busy tree; take over a remote branch; create from fresh `origin/<default>`
- [ ] Setup: `.worktreeinclude` copy (`.env*` fallback) + `gates.bootstrap`; a failure names the step and keeps the tree
- [ ] Personal layer: `<git-common-dir>/spec-driven/local.md`, root detected on first use, one-line notice
- [ ] Board: row target = PR-group tree; busy → no ★, `after …`; `Needs you: prune N merged trees`
- [ ] `trees prune [--apply]`: merged + pushed + clean + no live session only
- [ ] `execute.md` §0: when the session isn't already in the placed tree, place it and `EnterWorktree {path}`, then `claim take`; SKILL.md *Tools* → Trees; README *Teammates*
