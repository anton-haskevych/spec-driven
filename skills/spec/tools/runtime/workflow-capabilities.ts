import { normalizePhaseHint, parseContextRequest } from "../context/request";

export interface LocalPilot {
  kind: "local-pilot";
  spec: string;
  phase: string;
}

export const PILOT_MODES = new Set(["resume", "execute", "update", "handoff", "status"]);
const LOCAL_REPORTS = new Set(["doctor", "graph", "ready", "playbooks"]);
const LOCAL_LESSONS = new Set(["recall", "similar", "candidates", "add"]);
const LOCAL_PHASE_ACTIONS = new Set(["tick", "park", "unpark"]);

export function pilotModeRefusal(mode: string): string | undefined {
  return PILOT_MODES.has(mode) ? undefined : `${mode || "mode"} unavailable in local-pilot; full interactive parity remains pending`;
}

export function pilotCommandRefusal(argv: readonly string[], pilot: LocalPilot): string | undefined {
  const [name, ...args] = argv;
  if (name === "context") {
    const request = parseContextRequest(args, (name) => name === pilot.spec);
    const mode = pilotModeRefusal(request.mode);
    if (mode) return mode;
    if (request.name === pilot.spec && request.hint && normalizePhaseHint(request.hint) === pilot.phase) return undefined;
    return "context unavailable in local-pilot without its explicit spec and exact phase; automatic allocation is disabled";
  }
  if (name === "settings" && args.length === 0) return undefined;
  if (name === "gates") return undefined;
  if (name === "doctor" && args[0] === pilot.spec && args.length === 3 && args[1] === "--file" && args[2]) return undefined;
  if (name && LOCAL_REPORTS.has(name) && args[0] === pilot.spec && args.length === 1) return undefined;
  if (name === "lessons" && args[0] && LOCAL_LESSONS.has(args[0])) {
    if (args[0] !== "add" || args[2] === pilot.spec) return undefined;
  }
  if (name === "phase" && args[0] && LOCAL_PHASE_ACTIONS.has(args[0]) && args[1] === pilot.spec && args[2] === pilot.phase) return undefined;
  return `${name || "command"} unavailable in local-pilot; ownership, allocation, deployment, publication, launches and cleanup remain disabled`;
}

// A joined spec's phases are shared writes with a branch push, which the pilot's isolation rule forbids,
// until codex-runtime-support adds board writes.
export function pilotJoinedRefusal(spec: string): string {
  return `${spec} is on the board; a Codex pilot can't write it yet`;
}
