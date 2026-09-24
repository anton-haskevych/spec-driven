---
name: spec-idea
description: "Capture an idea into the backlog: a title, a short note, optional tags, priority and due date."
argument-hint: "<idea text>"
disable-model-invocation: true
---

Invoke the Skill tool with skill `spec-driven:spec` with args `idea $ARGUMENTS`, then follow what it loads. This skill only routes: the modes, hooks and context pack all live in the main `spec` skill.

Without a Skill tool (Codex and other hosts), read `../spec/SKILL.md` relative to this skill's folder and follow it with the arguments `idea $ARGUMENTS`.
