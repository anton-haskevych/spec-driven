# Idea Mode

An idea is work that doesn't deserve a spec yet: "organizer accounts for the competition directory". One small file per idea in `docs/specs/_backlog/`. It either grows into a spec, gets done without one, or gets dropped. No questions unless the text is genuinely unclear.

## Capture

Triggered by `/spec idea <text>`, or by the user saying "idea: …", "add to the backlog", "jot this down for later" in any session.

1. **Check it isn't already there.** Run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list <two or three key words>`. If an open spec or idea already covers it, say which and add to that one instead (a line in the idea's body, or a note for the spec's next session). Without Bun, list `docs/specs/_backlog/` and skim the titles.
2. **Write the file** `docs/specs/_backlog/<kebab-slug>.md`:

   ```markdown
   ---
   title: <one line, the thing itself, not the problem statement>
   tags: [<taxonomy values or plain words: area, domain, team>]
   priority: p1 | p2 | p3     # only if the user said how urgent it is
   due: YYYY-MM-DD            # only if the user gave a date
   created: <spec-bump.sh --now>
   ---
   <what and why, in the user's words, under 120 words>
   ```

   Leave out `priority` and `due` unless the user gave them; never invent urgency. Add `owner:` only when the user named the one person who must do it.
3. **Confirm in one line**: `Added idea <slug>` plus its priority or due if set. Don't commit unless the session is committing anyway.

## Close or drop

When an idea is done without a spec ("the directory typo idea is fixed"), or the user drops it:

1. Add a `resolution:` line to its frontmatter: what fixed it plus the commit or link (`resolution: fixed in a3f9c21`), or `resolution: dropped — <why>`.
2. Move it with `git mv docs/specs/_backlog/<slug>.md docs/specs/_backlog/_closed/<slug>.md`, creating `_closed/` if needed.

Closed items stay for the record; the list view ignores them.

## Promote

`/spec prep <slug>` grows an idea into a spec. Prep reads the idea as its starting ask and closes it with `resolution: promoted → docs/specs/<name>/` when the spec folder is created (prep.md → Stage 2).

## What this mode does not do

- No spec folder, no research, no phases. That is `prep`.
- No bulk imports from other trackers. Ideas arrive one at a time, as people have them.
