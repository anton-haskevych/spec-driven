---
needs: [2]
pr: A
---

# Phase 4 — `pr open`

**Goal:** One command opens a spec PR group's PR ready or as a draft, with the body built from the phases' Outcome lines, marks an existing draft ready without tripping the draft-skip race, or reports one already open; `<spec> <group>` targets resolve by branch for every `pr` command.

**Outcome:** Every PR opens the same way with a plain-words body, taking a draft out of draft actually starts CI, and a command aimed at group A never touches group B's PR · medium · risk: the ready race (CRM `git-workflow.md:23-34`), covered by a post-ready check.

**Files to touch:**
- `skills/spec/tools/pr/actions/open.ts`, `pr/actions/gh-writes.ts` (new)
- `skills/spec/tools/pr/resolve.ts` (`<spec> <group>` by branch)
- `skills/spec/tools/commands/pr.ts`, `commands/pr/open.ts`
- tests: `pr-open.test.ts`, `pr-gh-writes.test.ts`, `pr-resolve.test.ts`

## Implementation guidance

`gh-writes.ts` first (technical.md → GitHub writes): exit-code-aware, own budget, `GH_TIMEOUT_MS`, `create` and `ready` here; `merge` and reruns arrive in phases 5–6.

Target resolution: `<spec> <group>` → `treeName(spec, group).branch` (`trees/naming.ts:7`) → `gh pr view <branch>`; `<spec>` alone works only when the spec has one PR group, else refuse naming the groups. Spec-state links stay as the fallback for a spec whose branch is gone.

Body: one bullet per phase with `pr: <group>`, its **Outcome** line (read via `core/phase-entry.ts`), then `Spec: docs/specs/<spec>/`. Title: `<spec>: <group's first phase title>` unless the group has one phase. No Spec-state write at open: the PR is found by branch, and a write here would be a mid-CI docs push or a shared append across group branches.

Ready race: before `gh pr ready`, wait (`pollUntil`) until runs for the head SHA have registered (`gh run list --commit <sha>`); after it, confirm a `ready_for_review` run for that SHA exists whose first job did not conclude `skipped` (queued counts as started), and re-check once after a late push run registers that the ready run wasn't cancelled. If CI skipped itself, the result line says to push a new commit — never `gh run rerun`.

## Deliverables

- [x] `pr/actions/gh-writes.ts` with exit-code-aware `create` and `ready` — tests over stub replies incl. a gh error body that is valid JSON
- [x] `pr/resolve.ts`: `<spec> <group>` by branch; `<spec>` alone refuses with several groups — tests incl. two open groups
- [x] `pr/actions/open.ts`: create (ready or `--draft`) with Outcome-line body; existing draft → race-safe ready keyed on the `ready_for_review` run; already open and ready → reported; logs `opened`/`ready`
- [x] `pr open <spec> [<group>] [--draft]` result lines per technical.md

## Phase-local notes

- `gh pr create` needs the branch pushed; call `publish/push.ts` first (refuses detached HEAD and code on the default branch). In the babysit flow the asking session's handoff already pushed.
- Plugin-repo PRs are ready, not draft (this repo's `pr-opening.md` convention).
