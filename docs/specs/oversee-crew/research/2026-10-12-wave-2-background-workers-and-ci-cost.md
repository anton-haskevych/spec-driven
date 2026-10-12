---
date: 2026-10-12
wave: 2
lens: implementation
slug: background-workers-and-ci-cost
brief: product-brief.md
---

# Recon Wave 2 — background workers and CI cost

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Live probes run from the prep session, not agents. Claude Code 2.1.296, macOS.

## Verified — `claude --bg` worker (probe in a throwaway detached worktree of this repo)
- Command: `cd <worktree> && claude --bg --session-id <uuid> -n crew-probe --model haiku
  --permission-mode bypassPermissions --append-system-prompt-file <brief> '<prompt>'`.
- Stdout: `backgrounded · 510ad568 · crew-probe` + attach/logs/stop hints. The short id is
  the prefix of the real session id `510ad568-4bb2-…`.
- **`--session-id` is ignored with `--bg`:** the session got its own id, not the uuid
  passed. Worker identity must be read from the `backgrounded · <id> · <name>` line (or
  `claude agents --json`), not chosen up front.
- **cwd kept:** `pwd` and `git rev-parse --show-toplevel` = the worktree we launched in;
  no extra worktree was created. `CLAUDE_CODE_SESSION_ID` = the real id, so claims taken
  by the worker join to it as today (`T/sessions/own.ts`).
- **Brief works:** `--append-system-prompt-file` (absent from the options list, present in
  the `--bare` text) delivered the brief; the worker replied with its token. With
  `--system-prompt-snapshot` on by default the brief is fixed for the session's life.
- **Hooks and plugins load** in the background session (PreToolUse hooks ran; one MCP
  server asked for auth and did not block).
- **Session file:** `~/.claude/sessions/<pid>.json` with `"kind":"bg"`, `status`, `name`,
  `sessionId` — the existing reader `T/sessions/live.ts` sees background workers (it does
  not read `kind` today).
- **`claude agents --json --all`** for a background session:
  `{pid, id, cwd, kind:"background", startedAt, sessionId, name, status:"busy"|"idle",
  state:"working"|"done"}`. Job state also at `~/.claude/jobs/<id>/state.json`
  (undocumented; do not build on it).
- **End:** `claude stop <id>` → `stopped <id>`; `claude rm <id>` → `removed <id>`.
- **`claude logs <id>`** returns raw TTY escape output — unusable for reading; read the
  transcript `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` instead.
- **Trust:** `--bg` in a folder never trusted refuses: "Workspace not trusted. Run
  `claude` in <dir> once and accept the trust prompt, then retry." Worktrees of a trusted
  repo (`~/claude-worktrees/<repo>/<name>`) launched fine with no own trust entry — the
  same inheritance that let the Oct 11 tab launches work.
- Not probed: the state shown while a background worker waits on a permission prompt
  (guide: "Needs input"); `claude attach` in an iTerm tab; `worktree.bgIsolation` when
  launched from a main checkout (workers always start in a placed tree, so moot).

## Verified — push cost in CRM
- `.github/workflows/ci.yml`: `push` only on `main` (path-filtered); `pull_request` jobs
  gated `if: github.event_name == 'push' || github.event.pull_request.draft == false`
  (`ci.yml:76`); deploy and publish workflows trigger on `main` only.
- So a push to a feature branch with no PR, or with a draft PR, runs no CI. A push to a
  ready PR runs CI (synchronize) and cancels the run in progress. Push-on-every-commit is
  free until the PR is ready; after that the babysit rule (no docs pushes while CI runs)
  still governs.

## Implementation lock
- Seam located for every mechanism: launch (`T/launch/*`, `T/commands/launch.ts`),
  liveness (`T/sessions/live.ts` + `claude agents --json`), claims, ship mode
  (spec meta + `execute.md:157-171`, `handoff.md:176-177`, `babysit.md:91-107`),
  push (`execute.md` §1 + `:116`, `T/publish/push.ts`), board kinds
  (`T/board/model.ts:76-86`, `attention.ts`, `render.ts`, `joins.ts:93-97`),
  phase gate (`T/core/spec-state.ts:48-64`, doctor, hook, `T/phases/tick.ts`),
  storage (`stateDir`, settings, spec meta, `landOnMain`), wiring (`SUB_COMMANDS`,
  `skill-wiring.test.ts`).
- Reuse vs build decided per mechanism (wave 1 *Reuse*). Blast radius: launch tests,
  board JSON/golden tests, `OPEN_FIELDS` pin, wiring test regexes. Test surface: existing
  `stubRunner` / isolated runner patterns. Load-bearing concerns understood: authority
  (peer message is never consent), CI cancellation on ready PRs, trust on new folders,
  one-file-per-item for shared state.
