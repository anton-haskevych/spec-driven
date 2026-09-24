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
| 2.29.0 | **Task phases.** `code: false` on a phase: no TDD or PR gate, ticked with evidence; guard against QA/PR phases | next |
| 2.30.0 | **Tag playbooks.** `_playbook/<name>.md` with `match:` on taxonomy values, injected into the context pack | planned |

## Adoption

No bulk backfill. The project ledger and spec relations fill in as specs go through
prep, execute and handoff: new codebase lessons get promoted, and new or resumed specs
declare their neighbors. Improve the plugin from what real use shows.
