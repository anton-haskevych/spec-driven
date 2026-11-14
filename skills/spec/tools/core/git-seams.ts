import type { Git } from "./git";
import { recordReadPortOn, type RecordReadPort } from "../record/read";
import { gitRecordPort, type RecordPort } from "../record/ref";

export interface RecordPorts {
  port: RecordPort;
  read: RecordReadPort;
}

// Every git adapter a command test may swap for a fake. A command takes `seams?` on its deps and reads it
// through seamsOf, so production callers pass nothing and get git.
export interface GitSeams {
  recordPorts(git: Git): RecordPorts | undefined;
}

export interface Seamed {
  seams?: Partial<GitSeams>;
}

export const systemGitSeams: GitSeams = {
  recordPorts(git) {
    const port = gitRecordPort(git);
    return port ? { port, read: recordReadPortOn(git, port) } : undefined;
  },
};

export function seamsOf(deps: Seamed): GitSeams {
  return { ...systemGitSeams, ...deps.seams };
}

// Ports only: a command that needs the default branch keeps its own lookup, in its own order.
export function recordPortsOf(git: Git, deps: Seamed): RecordPorts | undefined {
  return seamsOf(deps).recordPorts(git);
}
