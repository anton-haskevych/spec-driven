# Resume Mode

Load the spec and orient the session so you can start working immediately. The spec may contain session logs from previous agents — these are critical context for picking up work.

## 1. Read all spec files

Read in parallel:
- `CLAUDE.md` — frontmatter (status, area, domain, scope) + relationship to code
- `design.md` — problem, decisions, UX flows
- `technical.md` — API contracts, data models, architecture
- `progress.md` — phases, what's done, what's next, **and session logs from previous work**

## 2. Read related context

Based on the spec's "Relationship to code" section and the technical.md file references:
- Read relevant subsystem `CLAUDE.md` files mentioned in the spec
- Optionally scan recent git history for commits mentioning the spec name: `git log --oneline --all --grep="<spec-name>" | head -10`

## 3. Present a session briefing

Output a concise briefing (not a wall of text — the user already wrote the spec):

```
## [Feature Name] — [status]

**What**: [1-sentence summary of the problem/feature]
**Key decisions**: [2-3 most important decisions from design.md, with the "why"]
**Progress**: [N/M items done] — currently in Phase X
**Next up**:
- [ ] First unchecked item
- [ ] Second unchecked item
- [ ] ...

**Code touchpoints**: [key files/directories this feature involves]
```

**If session logs exist in progress.md**, also surface:

```
**From previous sessions**:
- [Gotchas]: [traps to watch out for]
- [Dead ends]: [approaches that failed — don't retry]
- [Open questions]: [decisions still needed]
- [Current state]: [what's half-built]
- [Last session recommended]: [where to start]
```

Only include subsections that have content. If there are no session logs, skip this block entirely.

## 4. Ready to work

After the briefing, ask: **"What do you want to tackle?"** — don't assume. The user might want to:
- Continue implementing the next phase
- Revisit a design decision
- Check off completed items
- Discuss a blocker or deviation
