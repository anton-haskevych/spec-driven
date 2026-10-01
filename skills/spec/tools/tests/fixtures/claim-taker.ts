// Run by claims-store.test.ts as a separate process, so two takers really race.
import { takeClaim } from "../../claims/store";

const [dir, sessionId, startAt, mode] = Bun.argv.slice(2);
if (!dir || !sessionId || !startAt) throw new Error("usage: claim-taker <dir> <sessionId> <startAt> <fresh|stale>");
while (performance.timeOrigin + performance.now() < Number(startAt)) {
  // spin until both takers are ready
}
const claim = { spec: "alpha", phase: "4", sessionId, workspace: "/work/crm", claimedAt: new Date().toISOString() };
console.log(takeClaim(dir, claim, (existing) => mode === "stale" && existing.sessionId === "dead").kind);
