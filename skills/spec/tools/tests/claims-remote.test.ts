import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { deleteClaim, fetchClaims, pushClaim, readHolder } from "../claims/remote";
import type { Claim } from "../claims/store";
import { gitAt, type Git } from "../core/git";
import { claim as claimOf } from "./factories";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const claim = (phase: string, sessionId: string): Claim => claimOf({ phase, sessionId, workspace: `/work/${sessionId}` });
const holder = (host: string) => ({ user: "spec-tests", host });

describe("remote claims on a bare origin", () => {
  let repo: TestRepo;
  let laptop: Git;
  let desktop: Git;

  beforeAll(() => {
    repo = repoWithOrigin("spec-claims-remote-");
    laptop = gitAt(repo.dir, isolatedRunner);
    desktop = gitAt(repo.clone("desktop").dir, isolatedRunner);
  });
  afterAll(() => repo.cleanup());

  test("the holder is git's author name plus the given host", () => {
    expect(readHolder(laptop, "laptop")).toEqual(holder("laptop"));
  });

  test("a claim pushed from one clone is read back by another, holder included", () => {
    const pushed = pushClaim(laptop, { claim: claim("1", "s1"), holder: holder("laptop") }, { kind: "absent" });
    expect(pushed.kind).toBe("pushed");
    const read = fetchClaims(desktop);
    expect(read).toEqual({ ok: true, value: [{ claim: claim("1", "s1"), holder: holder("laptop"), sha: pushed.kind === "pushed" ? pushed.sha : "" }] });
  });

  test("a second create-only push of the same phase is refused", () => {
    pushClaim(laptop, { claim: claim("2", "s1"), holder: holder("laptop") }, { kind: "absent" });
    expect(pushClaim(desktop, { claim: claim("2", "s2"), holder: holder("desktop") }, { kind: "absent" }).kind).toBe("refused");
  });

  test("a lease on the holder's sha takes over, and the old holder's delete is then refused", () => {
    const first = pushClaim(laptop, { claim: claim("3", "s1"), holder: holder("laptop") }, { kind: "absent" });
    if (first.kind !== "pushed") throw new Error("setup push failed");
    const takeover = pushClaim(desktop, { claim: claim("3", "s2"), holder: holder("desktop") }, { kind: "at", sha: first.sha });
    expect(takeover.kind).toBe("pushed");
    expect(deleteClaim(laptop, "alpha", "3", first.sha).kind).toBe("refused");
    if (takeover.kind !== "pushed") return;
    expect(deleteClaim(desktop, "alpha", "3", takeover.sha).kind).toBe("pushed");
  });

  test("fetching prunes claims deleted on origin", () => {
    const pushed = pushClaim(laptop, { claim: claim("4", "s1"), holder: holder("laptop") }, { kind: "absent" });
    if (pushed.kind !== "pushed") throw new Error("setup push failed");
    expect(phasesOn(desktop)).toContain("4");
    deleteClaim(laptop, "alpha", "4", pushed.sha);
    expect(phasesOn(desktop)).not.toContain("4");
  });

  test("an unreachable origin is offline, for pushes and fetches", () => {
    const stray = repo.clone("stray");
    stray.git("remote", "set-url", "origin", join(repo.root, "missing.git"));
    const git = gitAt(stray.dir, isolatedRunner);
    expect(pushClaim(git, { claim: claim("5", "s3"), holder: holder("stray") }, { kind: "absent" }).kind).toBe("offline");
    expect(fetchClaims(git).ok).toBe(false);
  });
});

describe("remote claim race", () => {
  let repo: TestRepo;
  const PUSHERS = ["p1", "p2", "p3"];
  const ROUNDS = 3;

  beforeAll(() => {
    repo = repoWithOrigin("spec-claims-remote-race-");
    for (const pusher of PUSHERS) repo.clone(pusher);
  });
  afterAll(() => repo.cleanup());

  test("pushers on separate clones race for one phase and exactly one wins", async () => {
    const rounds = await Promise.all(Array.from({ length: ROUNDS }, (_, round) => race(String(round))));
    for (const outcomes of rounds) expect(outcomes.toSorted()).toEqual(["pushed", "refused", "refused"]);
  });

  async function race(phase: string): Promise<string[]> {
    const startAt = Date.now() + 800;
    const runs = PUSHERS.map((pusher) => {
      const argv = ["bun", join(import.meta.dir, "fixtures", "remote-claim-pusher.ts"), join(repo.root, pusher), pusher, phase, String(startAt)];
      return Bun.spawn(argv, { stdout: "pipe", stderr: "pipe" });
    });
    return Promise.all(runs.map(async (run) => (await new Response(run.stdout).text()).trim() || (await new Response(run.stderr).text()).trim()));
  }
});

function phasesOn(git: Git): string[] {
  const read = fetchClaims(git);
  return read.ok ? read.value.map((remote) => remote.claim.phase) : [];
}
