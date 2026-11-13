# Idea Mode

An idea is work that doesn't deserve a spec yet: "organizer accounts for the competition directory". It either grows into a spec, gets done without one, or gets dropped. No questions unless the text is genuinely unclear.

Where it lives depends on the board (`spec.ts settings` prints `board.record`; a pack's `Settings:` line says `board record on`):

- **Board on:** an idea is a card with `commitment: idea` on the shared record (*Capture* step 2). Files already in `docs/specs/_backlog/` stay and are still listed; each becomes a card the next time it is touched (*Touching an idea file*).
- **Board off:** one small file per idea in `docs/specs/_backlog/` (*Capture* step 2), exactly as before.

## Capture

Triggered by `/spec idea <text>`, or by the user saying "idea: …", "add to the backlog", "jot this down for later" in any session.

1. **Check it isn't already there.** Run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list <two or three key words>`. If an open spec or idea already covers it, say which and add to that one instead (a line in the idea's body, or a note for the spec's next session). Without Bun, list `docs/specs/_backlog/` and skim the titles.
2. **Write it down.**

   **Board on:** run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts card add "<title>" --quote "<the user's words, verbatim>" --app claude-code --commitment idea [--priority p0-p3] [--due YYYY-MM-DD] [--tag <word>]…`. Print its `card: c<n> added …` line; that number is the idea's name from now on. It refuses offline (a new card is never queued): say so and write nothing; never fall back to a file. Never put contact details in the title or quote.

   **Board off:** write the file `docs/specs/_backlog/<kebab-slug>.md`:

   ```markdown
   ---
   title: <one line, the thing itself, not the problem statement>
   tags: [<taxonomy values or plain words: area, domain, team>]
   priority: p0 | p1 | p2 | p3   # only if the user said how urgent it is
   due: YYYY-MM-DD            # only if the user gave a date
   created: <spec-bump.sh --now>
   ---
   <what and why, in the user's words, under 120 words>
   ```

   Leave out `priority` and `due` unless the user gave them; never invent urgency (the same goes for the card's flags). Ideas carry no `owner:`: owners are set on specs, on someone's word, with `spec.ts owner`.
3. **Confirm in one line**: `Added idea <slug>` (or `<c-number>`) plus its priority or due if set. Don't commit unless the session is committing anyway.

## Close or drop a card

Board on, for an idea that is a card: `spec.ts card close <id> "<evidence: a merged commit, a data check, the assignee's word>"` when it was done without a spec, `spec.ts card drop <id> "<why>"` when it was dropped, `spec.ts card update <id> --priority … --due …` to re-prioritise. A card is never deleted.

## Touching an idea file

Board on, and the idea is still a file in `docs/specs/_backlog/`: the touch makes it a card first.

1. `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts card import <slug>` (prep adds `--cover <spec>`). Its body becomes the card's quote, and its tags, priority and due date carry over. A file another session already imported is refused with that card's id: use that card.
2. Do the touch on the card: close, drop or update as above (prep: nothing more).
3. Move the file out of the list: add `resolution: card <id>` and `git mv` it into `_backlog/_closed/`. The list already hides a file a card came from, so a session that skips this shows nothing twice.

## Close or drop a file

Board off. When an idea is done without a spec ("the directory typo idea is fixed"), or the user drops it:

1. Add a `resolution:` line to its frontmatter: what fixed it plus the commit or link (`resolution: fixed in a3f9c21`), or `resolution: dropped — <why>`.
2. Move it with `git mv docs/specs/_backlog/<slug>.md docs/specs/_backlog/_closed/<slug>.md`, creating `_closed/` if needed.

Closed items stay for the record; the list view ignores them.

## Promote

`/spec prep <slug>` grows an idea into a spec. Prep reads the idea as its starting ask. Board off, it closes the file with `resolution: promoted → docs/specs/<name>/` when the spec folder is created; board on, the idea's card covers the new spec instead (prep.md → Stage 2).

## What this mode does not do

- No spec folder, no research, no phases. That is `prep`.
- No bulk imports from other trackers. Ideas arrive one at a time, as people have them.
