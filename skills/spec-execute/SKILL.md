---
name: spec-execute
description: "Work the next chunk of a spec: recon, preflight, test-first units, one commit each."
argument-hint: "<spec-name> [phase]"
disable-model-invocation: true
---

Invoke the Skill tool with skill `spec-driven:spec` with args `execute $ARGUMENTS`, then follow what it loads. This skill only routes: the modes, hooks and context pack all live in the main `spec` skill.

Without a Skill tool (Codex and other hosts), read `../spec/SKILL.md` relative to this skill's folder and follow it with the arguments `execute $ARGUMENTS`.
