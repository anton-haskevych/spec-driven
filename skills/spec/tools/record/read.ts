import { existsSync, mkdirSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gitCommonDir, stateDirIn, type Git } from "../core/git";
import type { TipRead } from "../core/land-on-ref";
import { RECORD_LAYOUT, RECORD_TRACKING_REF } from "./layout";
import { gitRecordPort, type RecordPort } from "./ref";
import { readRecordSnapshot, recordLayout, type RecordView } from "./view";

export interface RecordReadPort extends Pick<RecordPort, "blobIdsByPath" | "readBlobs"> {
  fetchTip(): TipRead;
  trackingTip(): string | undefined;
  lastFetched(): Date | undefined;
  markFetched(at: Date): void;
}

export type RecordRead =
  | { kind: "none"; problem?: string }
  | { kind: "read"; view: RecordView; live: boolean; ageMs?: number; offline?: string }
  | { kind: "newer"; layout: number };

export interface RecordReadOptions {
  fetch: boolean;
  now: Date;
}

// One read per command. Without `fetch` it never touches the network: hooks and the doctor, and every
// reader while the board is off, use what the last fetch left.
export function readRecord(port: RecordReadPort, options: RecordReadOptions): RecordRead {
  const fetched = options.fetch ? port.fetchTip() : undefined;
  if (fetched?.kind === "absent") return { kind: "none" };
  if (fetched?.kind === "at") {
    port.markFetched(options.now);
    return snapshot(port, fetched.sha, { live: true, ageMs: 0 });
  }
  const tip = port.trackingTip();
  if (tip === undefined) return { kind: "none" };
  const last = port.lastFetched();
  const ageMs = last ? Math.max(0, options.now.getTime() - last.getTime()) : undefined;
  const offline = fetched && "reason" in fetched ? fetched.reason : undefined;
  return snapshot(port, tip, { live: false, ...(ageMs === undefined ? {} : { ageMs }), ...(offline ? { offline } : {}) });
}

export function recordViewOf(read: RecordRead): RecordView | undefined {
  return read.kind === "read" ? read.view : undefined;
}

function snapshot(port: RecordReadPort, tip: string, how: { live: boolean; ageMs?: number; offline?: string }): RecordRead {
  const view = readRecordSnapshot(port, tip);
  if (!view.ok) return { kind: "none", problem: view.reason };
  const layout = recordLayout(view.value) ?? RECORD_LAYOUT;
  if (layout > RECORD_LAYOUT) return { kind: "newer", layout };
  return { kind: "read", view: view.value, ...how };
}

// The common dir is asked for only once a record exists, so a repo without one pays no extra git call.
export function gitRecordReadPort(git: Git): RecordReadPort | undefined {
  const port = gitRecordPort(git);
  if (!port) return undefined;
  let stamp: string | undefined;
  const stampPath = () => {
    if (stamp === undefined) {
      const commonDir = gitCommonDir(git);
      stamp = commonDir.ok ? stateDirIn(commonDir.value, "record-fetched") : "";
    }
    return stamp;
  };
  return {
    fetchTip: port.fetchTip,
    blobIdsByPath: port.blobIdsByPath,
    readBlobs: port.readBlobs,
    trackingTip() {
      const tip = git.out(["rev-parse", "--verify", "-q", RECORD_TRACKING_REF]);
      return tip.ok && tip.value ? tip.value : undefined;
    },
    lastFetched: () => {
      const path = stampPath();
      return path && existsSync(path) ? statSync(path).mtime : undefined;
    },
    markFetched(at) {
      const path = stampPath();
      if (!path) return;
      mkdirSync(dirname(path), { recursive: true });
      if (!existsSync(path)) writeFileSync(path, "");
      utimesSync(path, at, at);
    },
  };
}
