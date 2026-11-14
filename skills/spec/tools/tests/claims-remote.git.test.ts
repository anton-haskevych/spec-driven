import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readHolder } from "../claims/remote";
import { CLAIM_REFS } from "../claims/remote-payload";
import { gitRemotePort, type RemotePort } from "../claims/remote-take";
import { gitAt } from "../core/git";
import { isolatedRunner, repoWithOrigin, type TestRepo, type WorkingCopy } from "./git-repo";
import { remotePortContract } from "./remote-port-contract";

describe("remote claims on a bare origin", () => {
  let repo: TestRepo;
  let desktop: WorkingCopy;

  beforeAll(() => {
    repo = repoWithOrigin("spec-claims-remote-");
    desktop = repo.clone("desktop");
  });
  afterAll(() => repo.cleanup());

  const portAt = (dir: string): RemotePort => {
    const port = gitRemotePort(gitAt(dir, isolatedRunner));
    if (!port) throw new Error("no origin");
    return port;
  };

  function resetClaims(): void {
    const claims = repo.git("--git-dir", repo.origin, "for-each-ref", "--format=%(refname)", CLAIM_REFS);
    for (const ref of claims.split("\n").filter(Boolean)) repo.git("--git-dir", repo.origin, "update-ref", "-d", ref);
    repo.git("remote", "set-url", "origin", repo.origin);
  }

  remotePortContract("gitRemotePort", () => {
    resetClaims();
    return {
      port: portAt(repo.dir),
      elsewhere: portAt(desktop.dir),
      branch: "main",
      goOffline: () => repo.git("remote", "set-url", "origin", join(repo.root, "missing.git")),
    };
  });

  test("the holder is git's author name plus the given host", () => {
    expect(readHolder(gitAt(repo.dir, isolatedRunner), "laptop")).toEqual({ user: "spec-tests", host: "laptop" });
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
