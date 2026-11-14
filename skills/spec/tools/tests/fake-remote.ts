import { createHash } from "node:crypto";
import type { RemoteClaim } from "../claims/remote";
import type { RemotePort } from "../claims/remote-take";

export interface FakeRemote extends RemotePort {
  refs: Map<string, RemoteClaim>;
  branches: Set<string>;
  offline: boolean;
}

const UNREACHABLE = { kind: "offline", reason: "origin unreachable" } as const;

// An in-memory origin for claims with git's lease rules, held to remote-port-contract.ts.
export function fakeRemote(initial: readonly RemoteClaim[] = [], branches: readonly string[] = ["main"]): FakeRemote {
  let pushes = 0;
  const key = (spec: string, phase: string) => `${spec}/${phase}`;
  const remote: FakeRemote = {
    refs: new Map(initial.map((claim) => [key(claim.claim.spec, claim.claim.phase), claim])),
    branches: new Set(branches),
    offline: false,
    push(payload, lease) {
      if (remote.offline) return UNREACHABLE;
      const at = key(payload.claim.spec, payload.claim.phase);
      const current = remote.refs.get(at)?.sha;
      if ((lease.kind === "absent" && current) || (lease.kind === "at" && current !== lease.sha)) return { kind: "refused" };
      const sha = createHash("sha1").update(`${at}\0${++pushes}`).digest("hex");
      remote.refs.set(at, { ...payload, sha });
      return { kind: "pushed", sha };
    },
    remove(spec, phase, sha) {
      if (remote.offline) return UNREACHABLE;
      if (remote.refs.get(key(spec, phase))?.sha !== sha) return { kind: "refused" };
      remote.refs.delete(key(spec, phase));
      return { kind: "pushed" };
    },
    fetch: () => (remote.offline ? { ok: false, reason: UNREACHABLE.reason } : { ok: true, value: [...remote.refs.values()] }),
    hasBranch: (branch) => (remote.offline ? undefined : remote.branches.has(branch)),
  };
  return remote;
}
