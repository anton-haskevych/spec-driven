import { describe, expect, test } from "bun:test";
import type { Holder } from "../claims/remote-payload";
import { mirrorRelease, mirrorTake } from "../claims/remote-take";
import type { Claim } from "../claims/store";
import { claim as claimOf } from "./factories";
import { fakeRemote } from "./fake-remote";

const claim = (sessionId: string, fields: Partial<Claim> = {}): Claim => claimOf({ phase: "4", sessionId, workspace: `/work/${sessionId}`, ...fields });
const LAPTOP: Holder = { user: "Anton", host: "laptop" };
const DESKTOP: Holder = { user: "Taras", host: "desktop" };

const never = () => false;

describe("mirrorTake", () => {
  test("a free phase is mirrored to origin", () => {
    const origin = fakeRemote();
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "mirrored" });
    expect(origin.refs.get("alpha/4")?.claim.sessionId).toBe("s1");
  });

  test("the caller's own ref is already mirrored", () => {
    const origin = fakeRemote([{ claim: claim("s1"), holder: LAPTOP, sha: "sha0" }]);
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "mirrored" });
  });

  test("another machine's ref holds the phase", () => {
    const theirs = { claim: claim("s2"), holder: DESKTOP, sha: "sha0" };
    expect(mirrorTake(fakeRemote([theirs]), { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "held", by: theirs });
  });

  test("a replaceable ref is leased on its sha and replaced, marking who it was taken from", () => {
    const theirs = { claim: claim("s2"), holder: DESKTOP, sha: "sha0" };
    const origin = fakeRemote([theirs]);
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, (existing) => existing.sessionId === "s2")).toEqual({ kind: "took-over", from: theirs });
    expect(origin.refs.get("alpha/4")?.claim).toEqual(claim("s1", { takenFrom: "s2" }));
  });

  test("an unreachable origin is offline", () => {
    const origin = fakeRemote();
    origin.offline = true;
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "offline", reason: "origin unreachable" });
  });
});

describe("mirrorRelease", () => {
  test("deletes the caller's refs for the spec and leaves others", () => {
    const origin = fakeRemote([
      { claim: claim("s1"), holder: LAPTOP, sha: "sha0" },
      { claim: claim("s2", { phase: "5" }), holder: DESKTOP, sha: "sha1" },
    ]);
    expect(mirrorRelease(origin, "alpha", undefined, "s1")).toEqual({ kind: "released", phases: ["4"], takenOver: [] });
    expect([...origin.refs.keys()]).toEqual(["alpha/5"]);
  });

  test("a ref taken over from the caller is reported, not deleted", () => {
    const takeover = { claim: claim("s2", { takenFrom: "s1" }), holder: DESKTOP, sha: "sha1" };
    const origin = fakeRemote([takeover]);
    expect(mirrorRelease(origin, "alpha", "4", "s1")).toEqual({ kind: "released", phases: [], takenOver: [takeover] });
    expect(origin.refs.size).toBe(1);
  });

  test("an unreachable origin is offline", () => {
    const origin = fakeRemote();
    origin.offline = true;
    expect(mirrorRelease(origin, "alpha", undefined, "s1")).toEqual({ kind: "offline", reason: "origin unreachable" });
  });
});
