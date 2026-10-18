import { describe, expect, test } from "bun:test";
import type { FocusRow, FocusWork } from "../board/model";
import { boardFor, focusFor } from "../board/people";
import { board } from "./board-factories";

describe("focusFor", () => {
  const row = (spec: string, overrides: Partial<FocusRow> = {}): FocusRow => ({ spec, band: "should", position: 1, overdue: false, now: { kind: "none" }, sessions: [], work: [], unattributedPrs: [], ...overrides });
  const work = (person: string, mine = false): FocusWork => ({ person, mine, claims: [{ phase: "1", since: "t" }], prs: [] });
  const rows = [
    row("owned", { owner: "Taras Korpach" }),
    row("claimed", { work: [work("taraskorpach")] }),
    row("mine-remote", { work: [work("antonhaskevych", true)] }),
    row("mine-local", { sessions: [{ label: "x", status: "idle", since: "t" }] }),
    row("nobody"),
  ];
  const specs = (who: string, me?: string) => focusFor(rows, who, me).map((kept) => kept.spec);

  test("a teammate's name keeps the rows they own or have work on, matched by prefix", () => {
    expect(specs("taras", "anton-haskevych")).toEqual(["owned", "claimed"]);
  });

  test("me, or a name that is me, keeps my sessions' rows and my work's rows", () => {
    expect(specs("me", "anton-haskevych")).toEqual(["mine-remote", "mine-local"]);
    expect(specs("anton", "anton-haskevych")).toEqual(["mine-remote", "mine-local"]);
  });

  test("me without a git name still has this machine's sessions", () => {
    expect(specs("me")).toEqual(["mine-remote", "mine-local"]);
  });

  test("nobody matching keeps nothing", () => {
    expect(specs("zoe", "anton-haskevych")).toEqual([]);
  });
});

describe("boardFor", () => {
  const others = [{ label: "repo-82", status: "idle" as const, since: "t" }];
  const full = board({ me: "anton-haskevych", footer: { ...board().footer, otherSessions: others } });

  test("my view keeps other sessions, since they are mine; a teammate's drops them", () => {
    expect(boardFor(full, "me").footer.otherSessions).toEqual(others);
    expect(boardFor(full, "taras").footer).not.toHaveProperty("otherSessions");
  });
});
