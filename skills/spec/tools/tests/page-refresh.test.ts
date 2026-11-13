import { describe, expect, test } from "bun:test";
import { REBUILD_MS, refresher, shouldRebuild, type RefreshDeps } from "../page/refresh";
import { pageModel } from "./page-fixture";

describe("when the page rebuilds its model", () => {
  test("on a moved tip, after a minute, right after an answer, and first of all", () => {
    expect(shouldRebuild({ tipMoved: false, sinceBuildMs: undefined, answered: false })).toBe(true);
    expect(shouldRebuild({ tipMoved: true, sinceBuildMs: 1000, answered: false })).toBe(true);
    expect(shouldRebuild({ tipMoved: false, sinceBuildMs: REBUILD_MS, answered: false })).toBe(true);
    expect(shouldRebuild({ tipMoved: false, sinceBuildMs: 1000, answered: true })).toBe(true);
    expect(shouldRebuild({ tipMoved: false, sinceBuildMs: REBUILD_MS - 1, answered: false })).toBe(false);
  });

  test("a tick reads the tip every time and loads the board only when it should", async () => {
    let clock = 0;
    let tip = "t1";
    let builds = 0;
    const deps: RefreshDeps = { readTip: () => tip, buildModel: async () => (builds++, { ok: true, value: pageModel() }), now: () => clock };
    const refresh = refresher(deps);
    expect((await refresh.tick()).kind).toBe("rebuilt");
    clock = 5_000;
    expect(await refresh.tick()).toEqual({ kind: "same" });
    tip = "t2";
    expect((await refresh.tick()).kind).toBe("rebuilt");
    refresh.rebuildNext();
    expect((await refresh.tick()).kind).toBe("rebuilt");
    clock += REBUILD_MS;
    expect((await refresh.tick()).kind).toBe("rebuilt");
    expect(builds).toBe(4);
    expect(refresh.current()?.repo).toBe("crm");
  });

  test("a failed load keeps the last model and tries again next tick; ticks never overlap", async () => {
    let fail = false;
    let release: () => void = () => {};
    const refresh = refresher({
      readTip: () => "t1",
      buildModel: () => (fail ? Promise.resolve({ ok: false, reason: "gh down" }) : new Promise((done) => (release = () => done({ ok: true, value: pageModel() })))),
      now: () => 0,
    });
    const first = refresh.tick();
    expect(await refresh.tick()).toEqual({ kind: "busy" });
    release();
    expect((await first).kind).toBe("rebuilt");
    fail = true;
    refresh.rebuildNext();
    expect(await refresh.tick()).toEqual({ kind: "failed", reason: "gh down" });
    expect(refresh.current()).toBeDefined();
    expect(await refresh.tick()).toEqual({ kind: "failed", reason: "gh down" });
  });
});
