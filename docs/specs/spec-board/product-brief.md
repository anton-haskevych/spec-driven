# Spec Board — Product Brief

## Who & what
Anton runs several specs at once, each in its own session and workspace. He wants one view that says
what's being worked on right now, what he can start next, what's blocked and on what, and what needs him.

## Why
Specs depend on each other, share deadlines and touch the same code. Today the picture lives in his head
or gets rebuilt by hand in each chat, which takes several minutes and often comes out wrong. The list he
has shows 30 "active" specs with 14 marked top priority, so it can't answer "what next". From an older
workspace it shows days-old progress, and it can't say which spec opened which pull request.

## What we'll build
Asking for the spec list opens a board with four lanes, each spec phase in exactly one:
- **In flight**: who is on it, in which workspace, how recently that session was active, and its pull
  request and checks.
- **Ready**: ranked by what matters most, marked when it's safe to run alongside what's in flight, with
  the next step for each row.
- **Blocked**: what each one waits on, by name.
- **Needs you**: pull requests to merge or fix, deploys others wait on, overdue work, abandoned claims.

The board is the same from every workspace. Two sessions never take the same phase: a session that
starts a phase claims it, and others skip it. Starting parallel work is picking rows from the board.

It is built in layers: sources (specs, workspaces, sessions, pull requests) feed one shared picture,
and views sit on top. The terminal view is the first view. A styled web board can come later as another
view on the same picture, without rebuilding anything underneath.

## The real change
The spec workflow stops seeing only the workspace it runs in. It reads one shared picture of every
spec, every workspace, every live session and every pull request.

## Where it touches (product level)
- The spec list: the board becomes its default view.
- Starting work on a phase (claims it) and closing a session (releases it, shows what's next).
- Resuming a spec: a warning when a neighbor in flight touches the same code.
- Opening parallel sessions on chosen phases.

## Out of scope
- A web page or drawn dependency graph. Later, as another view on the same picture.
- Limits on how much can be in flight, and cleaning up old workspaces automatically.
- Re-labelling existing specs' statuses or priorities.
- Boards that span several repositories.
- Tracking sessions from tools other than Claude.
