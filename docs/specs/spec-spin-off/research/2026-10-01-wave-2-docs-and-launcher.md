---
date: 2026-10-01
wave: 2
lens: implementation
slug: docs-and-launcher
brief: product-brief.md
---

# Recon Wave 2 — docs-and-launcher

*Source of record — do not edit. explore-waves wave 2 (2 Explore agents) + local probes.*

## Verified

- **No mode file tells the agent to create a spec other than the one in play.** Discovered work goes to
  the current spec (`update.md:35,51-58` phase add/split; `execute.md:160`), to the user (`review.md:217`),
  or to the backlog (`idea.md:3,7,9`). *Session lifecycle* (`SKILL.md:72-82`) names only resume/execute as
  session starters and says nothing about a second spec.
- `needs` docs: phase edges `SKILL.md:241` ("local ids or spec#phase"; whole spec not mentioned), relations
  `SKILL.md:333,338` (whole spec allowed; phase-less not covered), `create.md:146` (spec), `create.md:284`
  (phase template), `resume.md:71` (blocked-by bullet assumes `#<phase>`).
- Prep stage defined by files at `SKILL.md:57,58,106,119,128`, `prep.md:25,36,89-90`, `create.md:15,17-18,129`,
  `taxonomy.md:7`. Line counts: SKILL.md 479, prep.md 291, create.md 384.
- **Command name.** Plugin `spec-driven` (`.claude-plugin/plugin.json`), skill `name: spec`. This machine
  installs it only as a plugin (`~/.claude/plugins/installed_plugins.json`); both `/spec-driven:spec`
  (126 uses) and `/spec` (1471) resolve. Thin router skills call `spec-driven:spec` (`skill-wiring.test.ts:109`).
  Codex uses `$spec` and runs no `!`/hooks.
- **Launcher exemplar.** `commands/pr-status.ts:10` takes `runner: Runner = systemRunner`;
  `tests/pr-status.test.ts:22-52` feeds `stubRunner` and asserts lines; `tests/git.test.ts:7-9` asserts
  `runner.calls`. `commands-table.test.ts` requires usage to start with the command key. No production
  code reads `process.env` except `core/run.ts:24`.
- Probes: `CLAUDE_CODE_SESSION_ID` and `TERM_PROGRAM=iTerm.app` are set in the Bash tool; `osascript -e
  'tell application "iTerm" to get version'` → 3.6.11; the current session's name is the Claude `-n` name.
  `claude --help`: `-n/--name`, positional prompt, `--session-id`, `--resume`, `--fork-session`.
- Release: `scripts/version.py --set <v>` writes three manifests; ROADMAP row; plugin repo PRs are ready.

## Reuse

- `Runner`/`systemRunner`, `stubRunner`, `SUB_COMMANDS` (`context/request.ts`) for validating the
  sub-command, the `COMMANDS` table.

## Still open

- What the tools emit for a seed-only folder and for parent `needs: [B]`.
- What earlier hand-made stubs actually lost (to shape the seed template).
