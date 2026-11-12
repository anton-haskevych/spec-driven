---
needs: [3a]
pr: B
---

# Phase 3b — A session hears that the plan changed

**Goal:** a session working from an older plan is told what changed, in one line: at its next write, in its
next pack, and within minutes while it is editing code.

**Outcome:** a session no longer builds for an hour on a plan a review has already changed · small · low
risk: one more hook that can only add a line.

**Files to touch:**
- `skills/spec/tools/plan/plan-version.ts`, `hooks/plan-changed.ts` (new)
- `skills/spec/SKILL.md` (hook registration), `context/board-lines.ts`, the outcome renderer from phase 3

## Implementation guidance

The summary is computed by diffing a spec's phase documents between the version this session last saw and the
tip: phases added or split, a phase moved to another PR group, tasks moved. Keep it to one line.

The per-session memory is a file in `tmpdir()` named by session id, as `hooks/lesson-recall.ts:38-45` keeps
its own: it holds the plan version last shown per spec and the time a fetch was last tried. It cleans itself
up at reboot; nothing is written to the git common dir.

The before-edit hook is a second command on the existing PreToolUse `Write|Edit|MultiEdit` matcher. Throttle
by the last **attempt**, not the last success: offline, a throttle on success retries on every edit and each
try waits out the timeout. Give the fetch 3 s, and after a failure wait 10 minutes. It says nothing when the
version is unchanged or the spec isn't joined, and resolves the project from `payload.cwd` with
`findProjectDir` (`gotcha-hook-payload-cwd-follows-cd`).

## Deliverables

- [ ] `plan-version`: the one-line change summary between two versions; per-session memory in tmpdir
- [ ] The summary on every write result and in packs, once per version
- [ ] `hooks/plan-changed.ts`: at most one fetch attempt every 120 s, 3 s limit, 10-minute back-off after a failure; emits the summary once per version; never blocks, fails open
- [ ] Offline test: 20 edits in a row with origin unreachable add under 4 s in total

## Phase-local notes

- `codex-runtime-support` phase 4 registers hooks natively for Codex; this hook has to be added to its
  inventory when that phase runs. Not a dependency.
