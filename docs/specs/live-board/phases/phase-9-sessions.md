---
needs: [4]
same-files-as: [8]
pr: F
---

# Phase 9 — Sessions and work not on the remote

**Goal:** the board shows who is on what, in which tree, in which mode and on which plan version, for both
machines, and names any worktree holding work that is not on the remote.

**Outcome:** "which sessions are running and on what" is answered from the board, including Taras's machine,
and work left on one laptop is noticed the same day · medium · low risk: one more document per session.

**Files to touch:**
- `skills/spec/tools/sessions/session-doc.ts` (new: type, reader, the stamp op), the command layer's write helper
- `skills/spec/tools/board/attribution.ts`, `board/people.ts`, `board/attention.ts`, `board/model.ts`,
  `board/render.ts`
- `skills/spec/tools/workspaces/changes.ts`, `commands/context.ts`
- `skills/spec/review.md`, `prep.md`, `list.md`, `SKILL.md`

## Implementation guidance

This phase waits on no other spec (Anton, 2026-11-11: "Not waiting on codex-runitime support at all!!!").
Claims stay exactly as they are: they are the lock. A session document is keyed by the `SessionRef` type that is
already in the code (`runtime/sessions.ts:13`, built for a Claude session by `runtime/claude/sessions.ts`), so a
Codex session fits the same shape later without any change here. Don't rewire claims to `SessionRef` in this
phase; that is `codex-runtime-support` 2b's work and neither spec needs the other to land first.

The file is named by a slug of `sessionKey(ref)` (`runtime/identity.ts:7-9`), which includes the session id.
`SourceRef.key` alone names the source, not the session (`runtime/sessions.ts:5-16`): keyed by it, every Claude
session on a machine would share one document. Get the current ref from `resolveIdentity`
(`runtime/resolve-identity.ts:12-34`) and reuse the `sessionRef` decoder in `claims/document.ts:58-63`.

A session document is written as one more op in each batch the session makes, so it costs no extra commit and
its `lastWriteAt` is a heartbeat for free. The **command layer** adds it (a `writeAs(session, plan)` helper),
not `record/write.ts`: the store stays free of session knowledge and testable without one, and `record sync`
and the page server write without a stamp. The stamp is a `replace` with no `ifVersion`: last write wins, so
two sub-agents under one session never fail a tick over a heartbeat. It does not count toward the 50-op cap,
and merges into an op the batch already has for that path.

The document carries what the board guesses today from launch titles and tree names
(`board/attribution.ts:15-45`): who, mode, tree, branch, the plan version it loaded. It does **not** carry what
the session holds: that is its claim, which already crosses machines on `refs/spec-claims/*`. The board joins
the two by session id. A second copy of "who holds phase 3" is the kind of drifting duplicate this spec
removes. Review and prep
sessions take no claim today; they write a session document at entry so "a review is changing this spec's plan"
is visible to the sessions executing it (session S192: "Did the phases 1 2 and others that already were doing
the work knew that you had a review").

Each stamp also carries `ahead` (commits not on the remote) and `edited` (uncommitted paths) for the session's
tree, from `workspaces/changes.ts`. The board turns a tree with either, and no write for more than a few hours,
into a *Needs you* row. On this machine the existing worktree scan covers trees with no session at all.

Liveness across machines can only be "last wrote N minutes ago"; keep the per-machine `ps` check
(`sessions/live.ts:64-78`) for this machine and say `remote` for the other, as the board does for claims.

## Deliverables

- [x] `session-doc` reader; the file named by the whole session key; every command's write stamps its session (who, mode, tree, plan version, time) last-write-wins; two sessions on one machine get two documents; two sub-agents ticking at once both land
- [x] Prep, create and review sessions register at entry; the pack lists other sessions on the same spec with their mode
- [ ] The board's per-person rows are built from session documents joined to claims by session id, on both machines
- [ ] Stamps carry `ahead` and `edited`; a tree holding work not on the remote for more than a few hours is a *Needs you* row
- [ ] `review.md`, `prep.md`, `list.md`, `SKILL.md` updated; ROADMAP row and version bump for PR F

## Phase-local notes

- `gotcha-session-files-span-every-repo`: scope anything read from `~/.claude/sessions` by this repo's worktrees.
- If `codex-runtime-support` 2b has landed by the time this starts, read claims through whatever it left; if
  not, read them as today. Either order works.
