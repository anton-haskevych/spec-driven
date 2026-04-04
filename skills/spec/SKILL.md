---
name: spec
description: Load an existing spec to resume work, update progress after implementation, review with the collegium panel, or create a new one. Use when starting a session around a feature, when the user mentions a spec by name, when asked to review/critique a spec, or after completing implementation work.
argument-hint: <feature-name>
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash, Agent
---

# /spec — Feature Spec (Resume, Update, or Create)

!`cat ${CLAUDE_SKILL_DIR}/taxonomy.md`

!`cat .claude/taxonomy.md 2>/dev/null || echo "No project taxonomy found — use free-form area/domain values."`

**If `$ARGUMENTS` is empty:** Infer the feature name from the current conversation context. Propose a kebab-case slug and ask the user to confirm before proceeding.

## Routing

Check if a spec folder exists at `docs/specs/$ARGUMENTS/`.

**Spec does not exist** → read [create.md](create.md) and follow its instructions

**Spec exists** → determine intent from conversation context:
- User mentions "review", "critique", "evaluate", "collegium", or asks for agents to review the spec → read [review.md](review.md)
- User just finished implementation, mentions updating/checking off items, or says "update" → read [update.md](update.md)
- Otherwise (session start, wants to work on it, mentions it by name) → read [resume.md](resume.md)

## Shared conventions

- Timestamps: never write by hand — run `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>`
- Taxonomy values: use the controlled vocabulary injected above
- Spec location: `docs/specs/<name>/`
- Style: direct, opinionated, no filler. Use "we" for decisions, "they" for users.
