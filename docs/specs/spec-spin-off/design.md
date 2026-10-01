# Spec Spin-off — Design

## Problem

One session works one spec (SKILL.md → *Session lifecycle*), but nothing in the mode files says what to
do when that session needs a **new** spec. Recon (`research/2026-10-01-wave-1-…`) found zero instructions
for it, so each session improvises. In CRM on 2026-09-30:

- `academy-ballroom-migration` was prepped and created inline after a full Phase 9 execute, then three
  dependency specs got hand-written stubs. Those stubs dropped Anton's verbatim rules, the rejected
  options, what the parent's Phases 13–15 need, the evidence paths and the parent's due date.
- `explicit-charge-handling` and the revived `schedule-lifecycle-safety` were written ~6,500 lines into
  a recurring-series review session.
- The phases waiting on the new specs used `**Blocked by spec:**` prose because `needs: [gift-cards]`
  fails on a spec with no phases (`gift-cards has no phase`).

## Decisions

| # | Decision | Chosen | Rejected |
|---|---|---|---|
| 1 | Home | A section of `prep.md` plus one rule in *Session lifecycle*. No new sub-command | `/spec spin-off` (Anton: no new user-facing commands) |
| 2 | Trigger | Prep asked for a new spec in a session that already worked another spec, or a new spec found during create/update/execute. Inline prep only when the user explicitly asks for it here | Always ask; context-size heuristics the agent can't measure |
| 3 | Handover | `seed.md` in the new spec's folder (≤ 60 lines) + stub `CLAUDE.md` | Product brief written by the parent (the brief is the fresh session's alignment gate) |
| 4 | Parent recon | Written into the child's `research/` as wave 0 (`lens: inherited`, `from: <parent>`) | Child re-runs it; links into the parent's transcript |
| 5 | Fresh session | `spec.ts launch prep <name>` opens an iTerm tab (Terminal.app window as fallback) running `claude -n "<name> prep" "/spec-driven:spec prep <name>"`; anything else prints the command | Headless `claude -p` (prep's one stop is a conversation); `--fork-session` (copies the heavy context); a subagent (can't fan out recon waves) |
| 6 | Dependency | Whole-spec `needs: [<spec>]` resolves on a spec with no phases and is met when that spec is finished (`isFinished`: done / good-enough / abandoned, or all phases ticked). Same rule the spec-level graph already uses | Prose "Blocked by spec" lines |
| 7 | Not now vs now | Work that can wait → `/spec idea`. Work that should be prepped now → spin-off | One mechanism for both |

## The flow

```
parent session (spec A)                         fresh session (iTerm tab "B prep")
──────────────────────                          ─────────────────────────────────
need for spec B appears
  ├─ name B, check `spec.ts list` for overlap
  ├─ docs/specs/B/CLAUDE.md   (stub, status prep)
  ├─ docs/specs/B/seed.md     (words, decisions, contract, evidence)
  ├─ docs/specs/B/research/<date>-wave-0-*.md  (if A's agents ran recon)
  ├─ A's phase N: needs: [B]  (when A waits on B)
  ├─ commit
  └─ spec.ts launch prep B ─────────────────▶  /spec-driven:spec prep B
back to A's work                                  precondition: seeded → read seed + wave 0
                                                  Stage 0–1 collapse → write brief → ⛔ stop
                                                  recon aims wave 1 at what wave 0 left open
                                                  … create B → A's `needs: [B]` may narrow to B#N
```

## Edge cases

- **Several specs at once** (chat 1 spun off three): one seed and one launch each; tabs run in parallel.
- **Seed exists, brief exists** → ordinary prep-stage resume; the seed stays as the origin record.
- **No terminal automation** (Codex, cloud, SSH, unknown terminal): `launch` prints the command line; the
  agent tells the user to run it.
- **Spec name taken** → no spin-off; the existing spec gets a note (idea.md step 1 pattern).
- **Parent doesn't wait on the child** (a side discovery) → no `needs`; `related:` on the child names the parent.
- **Whole-spec need, target has phases, status open** → unchanged: expands to its phases and waits on each.
