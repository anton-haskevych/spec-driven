# Runtime seams — 2026-11-08

Read-only source recon at 22e7ec7 (plugin 2.51.0), before implementation. The working source initially had no edits; only the investigation journal was created before Anton requested a spec. Parent `claude-plugins/CLAUDE.md` applies; no root guide exists.

## Verified source facts

| Concern | Existing source | Fact |
|---|---|---|
| Own identity | `skills/spec/tools/sessions/own.ts:3` | Only CLAUDE_CODE_SESSION_ID is read; missing ID means no claim. |
| Live sessions | `tools/sessions/live.ts:15,65` | Claude session files are verified against PID/process start; consumers use normalized session fields. |
| Claim comparisons | `tools/claims/store.ts:41–64`, `tools/claims/rules.ts:35–42` | Ownership/equality is naked sessionId; unavailable whole snapshot means unknown. |
| Source consumers | `tools/board/load.ts:57`, `tools/commands/claim.ts:71`, `tools/claims/live.ts:26`, `tools/trees/place.ts:121`, `tools/trees/prune.ts:47`, `tools/crew/deps.ts:28` | Six liveness I/O seams; shared algorithms can remain separated from provider details. |
| System composition | `tools/commands/board.ts`, `tools/commands/trees.ts:23`, `tools/crew/deps.ts:21`, `tools/commands/context.ts:35` | Existing system factories / held-reader wiring are injection points. |
| Normal launch | `tools/launch/command-line.ts:18–31` | Builds Claude named-session command and qualified slash prompt. |
| Terminal | `tools/launch/terminal.ts:6–20` | Runtime-neutral command/shellLine input already supports reuse. |
| Background | `tools/launch/background.ts:13`, `tools/sessions/agents.ts:28` | Claude --bg launcher and Claude global roster, with Claude-specific parsing. |
| Close-out | `tools/crew/close-out-run.ts:37–56`, `tools/sessions/transcript.ts:9` | Completion evidence reads Claude transcript; policy separately checks dirty/pushed/handoff/claim state. |
| Lifecycle routing | `tools/commands/crew/tick.ts`, `tools/crew/run-state.ts:18–22` | Stop/rm call Claude directly; launched entry lacks runtime. |
| Hooks | `tools/hooks/lesson-recall.ts:14–22`, `tools/hooks/spec-file-check.ts` | Watch Claude tool names and file_path, not native Codex patch paths. |
| Skill entry | `skills/spec/SKILL.md:1–41` | Claude interpolation and frontmatter-scoped hooks; mode wrappers already explain Codex manual dispatch. |
| Packaging | `.codex-plugin/plugin.json`, `scripts/version.py`, `.github/workflows/plugin-metadata.yml` | Codex metadata exists; versions are kept across three declarations; tests/type-check already run in CI. |

`tools/` above is under `skills/spec/`. No existing spec covers full Codex adoption. Related work is spec-board, spec-spin-off, oversee-crew-spec and spec-loop-automation. Existing source mechanisms include Result, Runner/AsyncRunner, atomic claim files, git shared-state roots, polling and Markdown section writers. Reuse rather than invent a database, scheduler or whole workflow copy.

`spec.ts graph files` reported no code-map overlap for the queried directory paths; this does not prove no overlap (the named related specs clearly touch these seams). `lessons candidates` reported no graduation candidate for those paths.

## Existing migration artifacts — observed, not endorsed architecture

The Codex cached 2.51.0 normal launcher and background launcher were modified outside source by the earlier harness migration. The source remains unmodified. Cache-only adaptations do not fix Codex identity/board/liveness/hooks. Native source-based adoption must replace them only after verified parity. That personal bridge is outside the implementation boundary of this plugin spec.
