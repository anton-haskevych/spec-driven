// Run by claims-remote.test.ts as a separate process, so pushers on different clones really race.
import { pushClaim } from "../../claims/remote";
import { gitAt } from "../../core/git";
import { isolatedRunner } from "../git-repo";

const [dir, sessionId, phase, startAt] = Bun.argv.slice(2);
if (!dir || !sessionId || !phase || !startAt) throw new Error("usage: remote-claim-pusher <clone> <sessionId> <phase> <startAt>");
while (performance.timeOrigin + performance.now() < Number(startAt)) {
  // spin until every pusher is ready
}
const claim = { spec: "alpha", phase, sessionId, workspace: dir, claimedAt: new Date().toISOString() };
console.log(pushClaim(gitAt(dir, isolatedRunner), { claim, holder: { user: "spec-tests", host: sessionId } }, { kind: "absent" }).kind);
