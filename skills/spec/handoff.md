# Handoff Mode

The session is ending. A fresh agent will start from zero context — the spec is the only bridge. Whatever isn't written down is lost.

This mode can be triggered explicitly (`/spec handoff`) or automatically when a phase completes during update.

## 1. Run the update flow

If there is any implementation work to record (commits since last session log, unchecked items that are now done, uncommitted changes):

- Follow update.md sections 1–4 fully: load state, cross-reference git, gather context, apply changes to `progress.md` and `CLAUDE.md` frontmatter.

If there is NO implementation work (e.g., you only added spec details, did research, or had a design conversation):

- Skip to section 2, but still check `git status` — if spec files were modified, note that.

## 2. Brain dump

This is the critical step. Reflect beyond what the structured session log captures. Think about what YOU know right now that a fresh agent won't.

Write a `### Handoff — YYYY-MM-DD` block in `progress.md` under `## Implementation Notes` (after any session log entry from step 1):

```markdown
### Handoff — YYYY-MM-DD

**Context the next agent needs**:
- [Implicit assumptions you're relying on that aren't in the spec]
- [Environment state — branches, migrations pending, services running, feature flags]
- [Codebase knowledge you gained — patterns, gotchas in specific files, non-obvious relationships]
- [Conversations or decisions made with the user that didn't make it into design.md]

**Where things stand**:
- [What's working right now — "X is deployed and tested", "Y renders correctly"]
- [What's half-built — "handler wired but mapper not done", "test exists but skipped"]
- [What's blocked — "needs user input on Z", "waiting for API access"]

**What the next agent should do first**:
- [Single most actionable starting point — be specific]
- [Any setup steps needed — "run migrations", "check out branch X", "read file Y first"]
```

Omit subsections that have nothing to report. But err on the side of writing too much — the next agent can skim, but can't recover what you didn't write.

## 3. Commit

Stage and commit all changes — both spec files and any implementation code:

```bash
git add docs/specs/<spec-name>/
# Also add any implementation files that were modified
git status  # verify what's staged
```

Commit with a descriptive message:

```
[handoff] <spec-name>: <1-line summary of session work>

Session notes and handoff context written to progress.md.
Next: <what the next agent should start with>
```

If there are no changes to commit (everything was already committed), skip this step and note it.

## 4. Signal completion

Print:

```
---
Handoff complete for [spec-name].

Committed: [commit hash] — [commit message first line]
Session log: docs/specs/<spec-name>/progress.md

Next agent should run: /spec resume <spec-name>
---
```

If the handoff was triggered by phase completion, also print:

```
Phase [N] is complete. Phase [N+1] is ready to begin.
```

Do not ask follow-up questions. Do not suggest further work. The session is ending.
