import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cardCommand } from "../commands/card";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { cardDoc, sourceDoc, tagDoc } from "./record-factories";

const NOW = new Date("2026-11-13T10:00:00+00:00");
const REAL_GIT_MS = 60_000;
const QUOTE = ["--quote", "print button please", "--app", "imessage", "--at", "2026-11-12", "--ref", "msg 1"];

describe("card load (real git)", () => {
  let repo: TestRepo;
  let a: WorkingCopy;
  const deps = { runner: isolatedRunner, env: { CLAUDE_CODE_SESSION_ID: "s1" }, now: () => NOW };
  const card = (...args: string[]) => Promise.resolve(cardCommand(a.dir, args, deps));
  const fileOf = (name: string, value: unknown) => {
    const path = join(a.dir, name);
    writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
    return path;
  };

  beforeAll(() => {
    repo = repoWithOrigin("spec-card-load-");
    repo.write("docs/specs/_playbook/settings.md", "---\ndocs: main\nboard:\n  record: on\n---\n");
    repo.commitAll("settings");
    repo.git("push", "-q", "origin", "main");
    a = repo.clone("a");
  });
  afterAll(() => repo.cleanup());

  const board = {
    cards: Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`c${String(index + 1).padStart(2, "0")}`, cardDoc({ id: `c${index + 1}`, title: `Academy ${index + 1}` })])),
    sources: Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`c${String(index + 1).padStart(2, "0")}/a`, sourceDoc({ card: `c${index + 1}`, quote: `words ${index + 1}` })])),
    tags: { "Academy Ballroom": tagDoc() },
  };

  test("refuses a file that doesn't read, naming each problem", async () => {
    expect(await card("load", "--file", fileOf("bad.json", "{"))).toStartWith("card load: refused, nothing written. bad.json is not JSON");
    expect(await card("load", "--file", fileOf("keys.json", { cards: { x: {} } }))).toBe('card load: refused, nothing written. cards: "x" is not a card id (c<n>)');
    expect(await card("load", "--file", join(a.dir, "missing.json"))).toBe(`card load: refused, nothing written. No file ${join(a.dir, "missing.json")}.`);
    expect(await card("load")).toStartWith("usage: ");
  }, REAL_GIT_MS);

  test("a taken number refuses the whole load; --move-taken moves the card up and lands everything in one commit", async () => {
    expect(await card("add", "Print button", ...QUOTE)).toBe("card: c1 added (asked)");
    const file = fileOf("board.json", board);
    expect(await card("load", "--file", file)).toBe("card load: refused, nothing written. c1 is already on the board; --move-taken moves it up to free numbers");
    const recordTip = () => a.git("ls-remote", "origin", "refs/spec-board/record").split("\t")[0] ?? "";
    const before = recordTip();
    expect(await card("load", "--file", file, "--move-taken")).toBe("card load: c1 → c31 (1 source)\ncard load: 30 cards, 30 sources and 1 tag on the board");
    a.git("fetch", "-q", "origin", "refs/spec-board/record");
    expect(a.git("rev-list", "--count", `${before}..${recordTip()}`).trim()).toBe("1");
    const list = await card("list");
    expect(list).toContain("c31 · asked · open — Print button");
    expect(list).toContain("c1 · asked · open — Academy 1");
    expect(await card("check")).toBe("card check: clean");
  }, REAL_GIT_MS);
});
