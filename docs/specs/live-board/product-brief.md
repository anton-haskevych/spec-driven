# Live Board — Product Brief

## Who & what
Anton and Taras run many Claude sessions at once on the same specs, each in its own workspace. They want one single live board for all of CRM Dance, where every ask, spec and phase shows its true state right now, to people and to every session. Tags slice it: a customer such as Academy Ballroom is a tag, and a tag view shows only that customer's work.

## Why
Each workspace holds its own copy of a spec, and a change reaches the others only when a session closes and publishes it. In between, sessions act on old copies. On Nov 11 one session offered a finished phase as ready to start, did not know a review had added two phases, and missed work another session had built but not yet put up for merging. Sessions redo each other's work and overwrite each other's plan. People have no single page to look at: about 400 specs and 250 ideas sit in folders. The Academy Ballroom board solved this for one customer, but it is a separate board, hand-built for that customer, and knows nothing about phases, sessions or pull requests.

## What we'll build
- One board for the whole team and all their Claudes, on a page that updates within seconds.
- Cards for asks and promises, as on the Academy board: sources (who said it, when, the exact words), priority, deadline and who has it.
- Tags on every card: customer, product area, anything else. Views by status and by tag; a tag carries its own priority and summary, as scopes do on the Academy board.
- A card links to its spec. The spec's phases, who is on each, in which workspace, and its pull request show on the card.
- A session records each change the moment it happens (phase started, item finished, phase added or moved by a review, pull request opened or merged) and reads the board before it acts. A session about to act on an older plan is told what changed.
- Work is saved to GitHub as it is done, not when someone remembers. An item counts as done only once its code is there, and the board shows any workspace, on either machine, holding work that is not.
- Spec documents stay as files in the project, so agents can still search them.
- The board is for Claude first. Claude keeps it up to date, adds and removes tasks, and reads it to understand the business need, the problem and the exact quotes. People mostly just look at it.
- Today's idea backlog folds into the cards: an idea is a card with no spec yet. Ideas, cards, specs and phases become one connected picture instead of separate lists.

## The real change
A spec's plan and progress stop being a document that each workspace copies. They become one shared record that every session writes to as it works and reads before it acts.

## Where it touches (product level)
- Starting, resuming, reviewing and closing work on a spec
- The spec list and "what's next"
- Capturing an idea or a customer ask, and turning one into a spec
- The Academy Ballroom board: its cards move onto the one board under an Academy Ballroom tag

## Out of scope
- A separate board per customer or per topic.
- Moving the existing specs and ideas over in bulk; each joins the board when it is next worked on.
- Changing how spec documents (design, research, lessons) are written.
- Giving customers access to the board.
- Customer-specific rules such as the Academy promise audit; those stay in the project's own skill.
