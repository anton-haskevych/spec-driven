import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cardCommand } from "../commands/card";
import { contextPack } from "../commands/context";
import { contextDeps } from "./context-fixture";
import { joinedRepo } from "./joined-repo";
import { INTENT_PLANNERS } from "../plan/intents";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { viewOf } from "./fake-record";
import { cardDoc } from "./record-factories";

const NOW = new Date("2026-11-13T10:00:00+00:00");
const REAL_GIT_MS = 60_000;
const QUOTE = ["--quote", "I like having the Upcoming Events, now it doesn't show", "--app", "imessage", "--person", "Chasity", "--at", "2026-11-11", "--ref", "msg 4821"];

describe("card add, source, update, list and check (real git)", () => {
  let repo: TestRepo;
  let a: WorkingCopy;
  let b: WorkingCopy;
  const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW };
  const card = (tree: WorkingCopy, ...args: string[]) => Promise.resolve(cardCommand(tree.dir, args, deps));

  beforeAll(() => {
    repo = repoWithOrigin("spec-card-");
    repo.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n  people: [Anton, Taras Korpach]\n---\n");
    repo.commitAll("settings");
    repo.git("push", "-q", "origin", "main");
    a = repo.clone("a");
    b = repo.clone("b");
  });
  afterAll(() => repo.cleanup());

  test("the first card starts the record, with its origin quote", async () => {
    expect(await card(a, "add", "Featured row keeps events visible", ...QUOTE, "--priority", "P1", "--tag", "Academy Ballroom", "--tag", "Schedule", "--assignee", "taras")).toBe(
      "card: c1 added (asked · p1 · tags: Academy Ballroom, Schedule)",
    );
    expect(await card(a, "list")).toBe(
      "c1 · p1 · asked · open — Featured row keeps events visible · Academy Ballroom, Schedule · Taras Korpach · nothing covers it\n" +
        "  “I like having the Upcoming Events, now it doesn't show” — Chasity, imessage, 2026-11-11\n" +
        "card: 1 open card",
    );
  }, REAL_GIT_MS);

  test("two clones adding at once get different numbers", async () => {
    const lines = await Promise.all([card(a, "add", "One", ...QUOTE), card(b, "add", "Two", ...QUOTE)]);
    expect(lines.map((line) => line.split(" ")[1]).toSorted()).toEqual(["c2", "c3"]);
  }, REAL_GIT_MS);

  test("a source is added under its card; a second origin is refused", async () => {
    expect(await card(b, "source", "c1", "--quote", "still missing", "--app", "gmail", "--at", "2026-11-12")).toBe("card: c1 · source b added (mention, gmail)");
    expect(await card(b, "source", "c1", "--role", "origin", "--quote", "again", "--app", "gmail")).toBe(
      "card source: refused, nothing written. c1 already has its origin (a); add this one as a mention",
    );
  }, REAL_GIT_MS);

  test("an update lands; one read at an older version is refused", async () => {
    expect(await card(b, "update", "c1", "--priority", "p0", "--due", "2026-11-20")).toBe("card: c1 updated (priority p0 · due 2026-11-20)");
    expect(await card(a, "update", "c1", "--note", "Spec soon", "--if-version", "0".repeat(40))).toStartWith("card update: refused, nothing written. cards/0/c1.json changed");
  }, REAL_GIT_MS);

  test("the rules are checked before anything is written", async () => {
    expect(await card(a, "add", "Call Anna", ...QUOTE, "--note", "anna@example.com")).toBe(
      "card add: refused, nothing written. cards/0/c4.json: note holds an email; never put contact details on the board",
    );
    expect(await card(a, "add", "Who", ...QUOTE, "--assignee", "Bob")).toBe("card add: refused, nothing written. Bob is not in board.people (Anton, Taras Korpach)");
    expect(await card(a, "add", "No words", "--app", "imessage")).toStartWith("card add: refused, nothing written. A card's words come with it");
    expect(await card(a, "update", "c1", "--status", "done")).toStartWith('card update: refused, nothing written. --status (close and drop end a card) must be open or doing, not "done"');
    expect(await card(a, "check")).toBe("card check: clean");
  }, REAL_GIT_MS);
});

describe("the card intent", () => {
  test("a queued card edit is laid over the record and replayed by the same plan", () => {
    const plan = INTENT_PLANNERS.card?.({ action: "update", id: "c9", fields: { priority: "p0" } });
    const view = viewOf({ "cards/0/c9.json": cardDoc({ id: "c9" }) });
    expect(typeof plan === "function" ? plan(view) : plan).toMatchObject({ ops: [{ op: "update", path: "cards/0/c9.json", patch: { priority: "p0" } }] });
    const unreadable = INTENT_PLANNERS.card?.({ action: "burn" });
    expect(typeof unreadable === "function" ? unreadable(view) : unreadable).toEqual({ refused: "this queued change can't be read; drop it" });
  });
});

describe("card cover on a joined spec, and the pack that shows it (real git)", () => {
  let repo: TestRepo;
  let tree: WorkingCopy;
  const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW };
  const card = (...args: string[]) => Promise.resolve(cardCommand(tree.dir, args, deps));

  beforeAll(() => {
    repo = joinedRepo("spec-card-cover-");
    tree = repo.clone("pr-a");
  });
  afterAll(() => repo.cleanup());

  test("a cover names phases the spec has; the spec's pack lists the card with its origin quote", async () => {
    expect(await card("add", "Featured row keeps events visible", ...QUOTE, "--priority", "p0")).toBe("card: c1 added (asked · p0)");
    expect(await card("cover", "c1", "alpha#9")).toBe("card cover: refused, nothing written. alpha has no phase 9 (phases: 2, 3)");
    expect(await card("cover", "c1", "nope")).toBe("card cover: refused, nothing written. no spec named nope");
    expect(await card("cover", "c1", "alpha#2")).toBe("card: c1 covered by alpha#2");
    const pack = await contextPack(tree.dir, { mode: "execute", name: "alpha" }, contextDeps({ runner: isolatedRunner, now: () => NOW }));
    expect(pack).toContain("Card c1 (p0 · asked) covers phase 2: Featured row keeps events visible\n  “I like having the Upcoming Events, now it doesn't show” — Chasity, imessage, 2026-11-11");
  }, REAL_GIT_MS);
});
