---
name: spec-review
description: "Collegium review of a spec by five reviewer agents; applies the findings in one commit."
argument-hint: "<spec-name>"
disable-model-invocation: true
---

Invoke the Skill tool with skill `spec-driven:spec` with args `review $ARGUMENTS`, then follow what it loads. This skill only routes: the modes, hooks and context pack all live in the main `spec` skill.

Without a Skill tool (Codex and other hosts), read `../spec/SKILL.md` relative to this skill's folder and follow it with the arguments `review $ARGUMENTS`.
