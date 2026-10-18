import { describe, expect, test } from "bun:test";
import type { PersonWork } from "../board/model";
import { personSection } from "../board/render-person";
import { NOW } from "./board-factories";

const work = (overrides: Partial<PersonWork> = {}): PersonWork => ({ person: "taras", mine: false, owns: [], onNow: [], prs: [], ...overrides });
const TWO_HOURS_AGO = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();

describe("personSection", () => {
  test("title in caps; owns with lane state, three then +N; claims with their machine; PRs by branch and verdict", () => {
    const section = personSection(
      work({
        owns: [
          { spec: "cross-studio", now: { kind: "ready", phases: ["1a"], step: "execute" } },
          { spec: "staff-ios", now: { kind: "blocked", reason: "needs 3" } },
          { spec: "gift-cards", now: { kind: "finished", status: "done" } },
          { spec: "four", now: { kind: "none" } },
          { spec: "five", now: { kind: "paused" } },
        ],
        onNow: [{ spec: "staff-ios", phase: "4", since: TWO_HOURS_AGO, host: "taras-thinkpad" }],
        prs: [{ branch: "feat/staff-ios-pr-b", cell: { number: 812, listed: true, verdict: "green" } }],
      }),
      NOW,
    );
    expect(section).toBe(
      [
        "TARAS",
        "  owns    cross-studio ready 1a · staff-ios blocked: needs 3 · gift-cards done · +2",
        "  on now  staff-ios 4 · claimed 2h ago on taras-thinkpad",
        "  PRs     #812 staff-ios pr-b · green",
      ].join("\n"),
    );
  });

  test("empty parts print —; me adds this machine's sessions and my claims here", () => {
    const section = personSection(
      work({
        person: "spec-tests",
        mine: true,
        onNow: [{ spec: "owner-split", phase: "4", since: TWO_HOURS_AGO }],
        sessions: [
          { label: "owner-split prep", spec: "owner-split", sub: "prep", status: "busy", since: TWO_HOURS_AGO },
          { label: "crm-a7", status: "idle", since: TWO_HOURS_AGO },
        ],
      }),
      NOW,
    );
    expect(section).toBe(
      ["SPEC-TESTS", "  owns      —", "  on now    owner-split 4 · claimed 2h ago here", "  PRs       —", "  sessions  2 here: owner-split prep · crm-a7"].join("\n"),
    );
  });

  test("nothing at all is one line", () => {
    expect(personSection(work(), NOW)).toBe("TARAS — owns nothing, nothing on now");
  });

  test("--local says owns only and why", () => {
    const section = personSection(work({ local: true, owns: [{ spec: "gift-cards", now: { kind: "finished", status: "done" } }] }), NOW);
    expect(section).toBe(["TARAS", "  owns  gift-cards done", "  (--local: no claims or PRs)"].join("\n"));
  });
});
