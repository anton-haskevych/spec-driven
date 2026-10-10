---
needs: [2]
pr: A
---

# Phase 4 — `pr open`

**Goal:** One command opens a spec PR group's PR ready or as a draft, with the body built from the phases' Outcome lines, or marks an existing draft ready without tripping the draft-skip race, and records the PR in Spec state.

**Outcome:** Every PR opens the same way with a plain-words body, and taking a draft out of draft actually starts CI · medium · risk: the ready race (CRM `git-workflow.md:23-34`), covered by a post-ready check.

**Files to touch:**
- `skills/spec/tools/pr/open.ts`, `pr/gh-writes.ts` (new), `pr/record.ts` (new, PR-link half), `core/spec-state-section.ts` (new)
- `skills/spec/tools/pr/resolve.ts` (regexes move out)
- `skills/spec/tools/commands/pr.ts` (`pr open`)
- tests: `pr-open.test.ts`, `pr-gh-writes.test.ts`, `pr-record.test.ts`

## Implementation guidance

`gh-writes.ts` first (technical.md → GitHub writes): exit-code-aware, own budget, `create` and `ready` here; `merge` and reruns arrive in phases 5–6. Lift `SPEC_STATE`/`PR_LINK` into `core/spec-state-section.ts` (second use) before writing the Spec-state writer. The writer is an `EditPlan` (exemplar `phases/deployed.ts:23-41`) that adds or updates `PR <group>: #<n> · <url>` and is validated by re-parsing `specPrNumbers`; tests end with the round-trip.

Body: one bullet per phase with `pr: <group>`, its **Outcome** line (read via `core/phase-entry.ts`), then `Spec: docs/specs/<spec>/`. Title: `<spec>: <group's first phase title>` unless the group has one phase.

Ready race: before `gh pr ready`, wait until runs for the head SHA have registered (`gh run list --commit <sha>`); after it, confirm within 60 s that a run started whose first job isn't skipped. If CI skipped itself, the result line says to push a new commit — never `gh run rerun`.

## Deliverables

- [ ] `pr/gh-writes.ts` with exit-code-aware `create` and `ready` — tests over stub replies incl. a gh error body that is valid JSON
- [ ] `core/spec-state-section.ts` holds `SPEC_STATE`/`PR_LINK`; `pr/resolve.ts` and `board/load.ts` use it (refactor, green)
- [ ] `pr/record.ts` PR-link writer (`EditPlan`, idempotent, `specPrNumbers` round-trip)
- [ ] `pr/open.ts`: create (ready or `--draft`) with Outcome-line body; existing draft → race-safe ready with post-ready CI check; logs `opened`/`ready`
- [ ] `pr open <spec> [<group>] [--draft]` result lines per technical.md

## Phase-local notes

- `gh pr create` needs the branch pushed; call `publish/push.ts` first (refuses detached HEAD and code on the default branch).
- Plugin-repo PRs are ready, not draft (this repo's `pr-opening.md` convention).
