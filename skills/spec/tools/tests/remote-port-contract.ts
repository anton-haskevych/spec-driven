import { beforeEach, describe, expect, test } from "bun:test";
import type { PushedClaim } from "../claims/remote";
import type { RemotePayload } from "../claims/remote-payload";
import type { RemotePort } from "../claims/remote-take";
import { claim as claimOf } from "./factories";

// Two machines on one origin, real or fake. `make` runs before each case: no claims on origin, both online,
// and `branch` exists on origin.
export interface RemotePortHarness {
  port: RemotePort;
  elsewhere: RemotePort;
  branch: string;
  goOffline(): void;
}

const payload = (phase: string, sessionId: string, host: string): RemotePayload => ({
  claim: claimOf({ phase, sessionId, workspace: `/work/${sessionId}` }),
  holder: { user: "spec-tests", host },
});

function pushedSha(pushed: PushedClaim): string {
  if (pushed.kind !== "pushed") throw new Error(`push ${pushed.kind}`);
  return pushed.sha;
}

const phasesOn = (port: RemotePort) => {
  const read = port.fetch();
  return read.ok ? read.value.map((remote) => remote.claim.phase) : [];
};

export function remotePortContract(name: string, make: () => RemotePortHarness): void {
  describe(`RemotePort contract: ${name}`, () => {
    let world: RemotePortHarness;
    beforeEach(() => {
      world = make();
    });

    test("a claim pushed from one machine is read back by another, holder included, at a 40-hex sha", () => {
      const sha = pushedSha(world.port.push(payload("1", "s1", "laptop"), { kind: "absent" }));
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
      expect(world.elsewhere.fetch()).toEqual({ ok: true, value: [{ ...payload("1", "s1", "laptop"), sha }] });
    });

    test("a second create-only push of the same phase is refused", () => {
      world.port.push(payload("1", "s1", "laptop"), { kind: "absent" });
      expect(world.elsewhere.push(payload("1", "s2", "desktop"), { kind: "absent" }).kind).toBe("refused");
    });

    test("a lease on the holder's sha takes over; the old holder's delete is then refused, the new one's lands", () => {
      const first = pushedSha(world.port.push(payload("1", "s1", "laptop"), { kind: "absent" }));
      const takeover = pushedSha(world.elsewhere.push(payload("1", "s2", "desktop"), { kind: "at", sha: first }));
      expect(world.port.remove("alpha", "1", first).kind).toBe("refused");
      expect(world.elsewhere.remove("alpha", "1", takeover).kind).toBe("pushed");
    });

    test("fetching drops claims deleted on origin", () => {
      const sha = pushedSha(world.port.push(payload("1", "s1", "laptop"), { kind: "absent" }));
      expect(phasesOn(world.elsewhere)).toEqual(["1"]);
      world.port.remove("alpha", "1", sha);
      expect(phasesOn(world.elsewhere)).toEqual([]);
    });

    test("a branch on origin is there, a missing one is not", () => {
      expect([world.port.hasBranch(world.branch), world.port.hasBranch("feat/nowhere")]).toEqual([true, false]);
    });

    test("an unreachable origin is offline for pushes, deletes and fetches, and can't say whether a branch exists", () => {
      world.goOffline();
      expect(world.port.push(payload("1", "s1", "laptop"), { kind: "absent" }).kind).toBe("offline");
      expect(world.port.remove("alpha", "1", "0".repeat(40)).kind).toBe("offline");
      expect(world.port.fetch().ok).toBe(false);
      expect(world.port.hasBranch(world.branch)).toBeUndefined();
    });
  });
}
