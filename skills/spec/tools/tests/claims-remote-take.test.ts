import { describe, expect, test } from "bun:test";
import type { RemoteClaim } from "../claims/remote";
import type { Holder } from "../claims/remote-payload";
import { mirrorRelease, mirrorTake, remoteHolderName, type RemotePort } from "../claims/remote-take";
import type { Claim } from "../claims/store";

const claim = (sessionId: string, fields: Partial<Claim> = {}): Claim => ({ spec: "alpha", phase: "4", sessionId, workspace: `/work/${sessionId}`, claimedAt: "2026-10-01T20:00:00.000Z", ...fields });
const LAPTOP: Holder = { user: "Anton", host: "laptop" };
const DESKTOP: Holder = { user: "Taras", host: "desktop" };

// An in-memory origin with git's lease semantics.
function fakeOrigin(initial: RemoteClaim[] = []): RemotePort & { refs: Map<string, RemoteClaim>; offline: boolean } {
  let next = initial.length;
  const refs = new Map(initial.map((remote) => [`${remote.claim.spec}/${remote.claim.phase}`, remote]));
  return {
    refs,
    offline: false,
    push(payload, lease) {
      if (this.offline) return { kind: "offline", reason: "unreachable" };
      const key = `${payload.claim.spec}/${payload.claim.phase}`;
      const current = refs.get(key)?.sha;
      if ((lease.kind === "absent" && current) || (lease.kind === "at" && current !== lease.sha)) return { kind: "refused" };
      const sha = `sha${++next}`;
      refs.set(key, { ...payload, sha });
      return { kind: "pushed", sha };
    },
    remove(spec, phase, sha) {
      if (this.offline) return { kind: "offline", reason: "unreachable" };
      if (refs.get(`${spec}/${phase}`)?.sha !== sha) return { kind: "refused" };
      refs.delete(`${spec}/${phase}`);
      return { kind: "pushed" };
    },
    fetch() {
      return this.offline ? { ok: false, reason: "unreachable" } : { ok: true, value: [...refs.values()] };
    },
  };
}

const never = () => false;

describe("mirrorTake", () => {
  test("a free phase is mirrored to origin", () => {
    const origin = fakeOrigin();
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "mirrored" });
    expect(origin.refs.get("alpha/4")?.claim.sessionId).toBe("s1");
  });

  test("the caller's own ref is already mirrored", () => {
    const origin = fakeOrigin([{ claim: claim("s1"), holder: LAPTOP, sha: "sha0" }]);
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "mirrored" });
  });

  test("another machine's ref holds the phase", () => {
    const theirs = { claim: claim("s2"), holder: DESKTOP, sha: "sha0" };
    expect(mirrorTake(fakeOrigin([theirs]), { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "held", by: theirs });
  });

  test("a replaceable ref is leased on its sha and replaced, marking who it was taken from", () => {
    const theirs = { claim: claim("s2"), holder: DESKTOP, sha: "sha0" };
    const origin = fakeOrigin([theirs]);
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, (existing) => existing.sessionId === "s2")).toEqual({ kind: "took-over", from: theirs });
    expect(origin.refs.get("alpha/4")?.claim).toEqual(claim("s1", { takenFrom: "s2" }));
  });

  test("an unreachable origin is offline", () => {
    const origin = fakeOrigin();
    origin.offline = true;
    expect(mirrorTake(origin, { claim: claim("s1"), holder: LAPTOP }, never)).toEqual({ kind: "offline", reason: "unreachable" });
  });
});

describe("mirrorRelease", () => {
  test("deletes the caller's refs for the spec and leaves others", () => {
    const origin = fakeOrigin([
      { claim: claim("s1"), holder: LAPTOP, sha: "sha0" },
      { claim: claim("s2", { phase: "5" }), holder: DESKTOP, sha: "sha1" },
    ]);
    expect(mirrorRelease(origin, "alpha", undefined, "s1")).toEqual({ kind: "released", phases: ["4"], takenOver: [] });
    expect([...origin.refs.keys()]).toEqual(["alpha/5"]);
  });

  test("a ref taken over from the caller is reported, not deleted", () => {
    const takeover = { claim: claim("s2", { takenFrom: "s1" }), holder: DESKTOP, sha: "sha1" };
    const origin = fakeOrigin([takeover]);
    expect(mirrorRelease(origin, "alpha", "4", "s1")).toEqual({ kind: "released", phases: [], takenOver: [takeover] });
    expect(origin.refs.size).toBe(1);
  });

  test("an unreachable origin is offline", () => {
    const origin = fakeOrigin();
    origin.offline = true;
    expect(mirrorRelease(origin, "alpha", undefined, "s1")).toEqual({ kind: "offline", reason: "unreachable" });
  });
});

describe("remoteHolderName", () => {
  test("user@host, with the session name when there is one", () => {
    expect(remoteHolderName({ claim: claim("s2", { sessionName: "alpha execute 4" }), holder: DESKTOP, sha: "x" })).toBe("Taras@desktop (alpha execute 4)");
    expect(remoteHolderName({ claim: claim("s2"), holder: DESKTOP, sha: "x" })).toBe("Taras@desktop");
  });
});
