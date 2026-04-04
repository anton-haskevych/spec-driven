# Update Mode

Capture implementation progress and context for the next agent session. The spec is the only bridge between sessions — whatever isn't written here is lost. A fresh agent reading this spec should be able to pick up work without re-discovering anything.

## 1. Load current state

Read in parallel:
- `progress.md` — current phases, checked/unchecked items, existing session notes
- `CLAUDE.md` — frontmatter (status, area, domain, scope)
- `technical.md` — skim for planned approach (needed for divergence detection)

## 2. Cross-reference with git

Run: `git log --oneline -20` and `git diff --stat HEAD~5`

Also check: `git status` — are there uncommitted changes?

Compare recent commits against unchecked items. For each item, classify:
- **Done as specified** — implementation matches what technical.md/design.md described
- **Done differently** — implemented, but approach diverged from spec (note *why*)
- **Partially done** — touched but not fully complete
- **New work not in spec** — discovered dependencies, prerequisite refactors, etc.

## 3. Gather handoff context

Reflect on the session and identify:

- **Approach changes**: where reality diverged from the spec and why
- **Gotchas**: things that look simple but aren't — traps for the next implementer
- **Dead ends**: approaches that were tried and didn't work, with the reason (prevents the next agent from wasting time re-discovering the same failures)
- **Current working state**: what's half-built — "handler is wired up but mapper isn't done", "migration written but not applied", "test exists but is skipped"
- **Open questions**: decisions that need human input before the next agent can proceed
- **Next session should**: the single most actionable starting point — what to do first

## 4. Apply changes

**In `progress.md`:**
- **Check off completed items** — change `- [ ]` to `- [x]`
- **Append a session log entry** under an `## Implementation Notes` section using this format:

```markdown
### Session — YYYY-MM-DD

**Completed**: [brief list of what got done]

**Approach changes**:
- [spec said X] → [built Y] because [reason]

**Gotchas**:
- [thing that looks simple but isn't — why it's tricky]

**Dead ends** (don't try these):
- [approach] — failed because [reason]

**Current state**:
- [file/component]: [wired up | half-done | needs testing | blocked on X]

**Open questions**:
- [decision or input needed before next agent can proceed]

**Next session should**:
- [specific first action to take when resuming this work]
```

Omit any subsection that has nothing to report. Preserve existing notes — append, don't overwrite.

- **Update TODO Later** if new post-MVP items were identified

**In `CLAUDE.md` frontmatter:**
- **Bump timestamp** — run `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>`
- **Transition status** if applicable:
  - `draft` → `in-progress`: first items checked off
  - `in-progress` → `done`: all items across all phases checked
  - Print a notice: "Status: draft → in-progress"

## 5. Report and nudge

After writing changes, print what was done:

```
Updated: [path to progress.md]
  - Checked off N items
  - Session log added

Remaining work:
- [ ] Next unchecked item 1
- [ ] Next unchecked item 2

[If current phase is complete:]
Phase X complete. Ready to start Phase Y?
```

If there are uncommitted changes, add:

```
You have uncommitted changes — consider committing the implementation + spec update together.
```
