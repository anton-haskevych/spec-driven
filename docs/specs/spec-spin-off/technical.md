# Spec Spin-off — Technical

Ground truth: `research/2026-10-01-wave-1-*.md` … `wave-3-*.md`. Paths relative to `skills/spec/`.

## Whole-spec `needs` (phase level)

`tools/ready/refs.ts` `resolvePhaseRef`: a ref without `#` that names a spec, where that spec has **no
phases or a finished status** (`done`, `good-enough`, `abandoned`), resolves to one mark
`{ label: <spec>, done: isFinished(node), deployed: isFinished(node) }`. Otherwise unchanged (a spec with
phases and an open status expands to its phases). `isFinished` is `graph/nodes.ts:60`; its status test is
extracted as `hasFinishedStatus(node)` so both use one rule. The doctor, the spec-file hook and
`phases/validate.ts` go through `resolvePhaseRef`, so the `has no phase` error disappears for this case
with no further change. Waiting reason reads `needs gift-cards`.

## seed.md

Written by the parent session, read by `prep.md` → Precondition. Not validated by tools (the spec-file
hook ignores non-`CLAUDE.md`/phase/ledger files). ≤ 60 lines.

```markdown
---
from: <parent spec>                 # or the journal/incident it came from
from-session: <$CLAUDE_CODE_SESSION_ID, when set>
created: <spec-bump.sh --now>
---

# <name> — Seed

## Why it branched
## In the user's words        (verbatim quotes, attributed and dated)
## Decided                    (each: chosen · rejected · who: user | recommended)
## What <parent> needs        (phase N needs …; deadline; or "nothing — side discovery")
## Evidence                   (wave-0 files, parent spec files with sections/lines, journals)
## Open questions             (only what the brief can't be written without)
```

## Wave 0 research

`research/<date>-wave-0-<slug>.md`, immutable, frontmatter `date, wave: 0, lens: inherited, slug, from:
<parent>`. Body uses the wave format (*Verified / Reuse / Still open*); findings keep `file:line` and mark
what the parent spot-checked. Prep's implementation lock counts it as a wave.

## `spec.ts launch`

`launch <sub-command> <spec-name>`, e.g. `launch prep gift-cards`.

- **Validate:** sub-command ∈ `SUB_COMMANDS` (`context/request.ts`); name matches
  `^[a-z0-9][a-z0-9-]*$`. Else `launch: …` refusal line.
- **Prompt:** `/spec-driven:spec <sub> <name>` (the plugin's qualified skill name; every install on this
  machine is the plugin, and `/spec` alone can be shadowed). Session name `<name> <sub>`.
- **Shell line:** `cd '<projectDir>' && claude -n '<name> <sub>' '<prompt>'` (single-quote escaping).
- **Terminal** from env: `TMUX` set → `tmux new-window -n <name> -c <dir> <cmd>`; `TERM_PROGRAM=iTerm.app`
  → `osascript` new tab in the current window (new window when none) + `write text`; `Apple_Terminal` →
  `osascript` `do script`. AppleScript string escapes `\` and `"`.
- **Output, one line:** `Launched: <terminal> — <name> <sub>` or, when no terminal fits or the launch
  fails, `launch: run this in a new terminal: <shell line>`. Always exit 0.
- **Shape:** `launch/command-line.ts` (prompt, session name, shell line; pure), `launch/terminal.ts`
  (pick terminal from env, build argv; pure), `commands/launch.ts` (`launchReport(dir, args, env =
  process.env, runner = systemRunner)`). Tests with `stubRunner` assert the argv; exemplar
  `commands/pr-status.ts` + `tests/pr-status.test.ts`.

## Mode-file changes

- `prep.md`: *Spin-off* section (trigger, the six steps, launch); Precondition branch *seeded* (seed.md,
  no brief → read seed + wave 0, skip to 2.2, carry open questions into the stop); Stage 4 counts wave 0.
- `SKILL.md`: *Session lifecycle* rule ("a new spec found mid-session is spun off"); prep-stage wording
  accepts `seed.md`; *Phase edges* and *Relations* document whole-spec refs on phase-less specs; *Tools*
  bullet for `launch`.
- `create.md`: dependencies that don't exist yet → spin off each; phase template `needs` mentions whole specs.
- `update.md`: "new work not in spec" that is its own spec → spin off.
- `resume.md`: blocked-by bullet has a whole-spec form.
- `taxonomy.md`: `prep` stage mentions `seed.md`.
- `README.md`: one line on spin-off.
