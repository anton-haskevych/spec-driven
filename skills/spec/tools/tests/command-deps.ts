import { systemJoinDeps, type JoinDeps } from "../commands/join";
import { systemPhaseDeps } from "../commands/phase/context";
import { systemRecordDeps, type RecordDeps } from "../commands/record";
import { systemFieldDeps, type FieldWriteDeps } from "../commands/spec-field-write";
import type { GitSeams } from "../core/git-seams";
import type { AsyncRunner, Runner } from "../core/run";
import type { PhaseDeps } from "../plan/phase-writer";
import { fakeRecord, fakeRecordReadPort, type FakeRecord } from "./fake-record";
import { gitStub, notARepoRunner, type GitStubOptions } from "./stub-runner";

// A checkout with no repo behind it: gitStub answers what it says about itself, the fake record is origin's.
export interface FakeCheckout {
  runner: Runner & { calls: string[][] };
  seams: Partial<GitSeams>;
  record: FakeRecord;
}

export function fakeCheckout(options: GitStubOptions & { record?: FakeRecord }): FakeCheckout {
  const { record = fakeRecord(), ...stub } = options;
  return { runner: gitStub(stub), seams: { recordPorts: () => ({ port: record, read: fakeRecordReadPort(record) }) }, record };
}

// Each builder starts outside any repo (git answers "not a repository") with no session in the env; pass a
// FakeCheckout's runner and seams to run a command against the fakes.
export function phaseDeps(overrides: Partial<PhaseDeps> = {}): PhaseDeps {
  return { ...systemPhaseDeps(), runner: notARepoRunner, ...overrides };
}

export function joinDeps(overrides: Partial<JoinDeps> = {}): JoinDeps {
  const runner = overrides.runner ?? notARepoRunner;
  return { ...systemJoinDeps(), runner, asyncRunner: asyncOf(runner), env: {}, ...overrides };
}

export function recordDeps(overrides: Partial<RecordDeps> = {}): RecordDeps {
  return { ...systemRecordDeps(), runner: notARepoRunner, env: {}, ...overrides };
}

export function fieldWriteDeps(overrides: Partial<FieldWriteDeps> = {}): FieldWriteDeps {
  return { ...systemFieldDeps(notARepoRunner), env: {}, ...overrides };
}

function asyncOf(runner: Runner): AsyncRunner {
  return { run: async (argv, options) => runner.run(argv, options) };
}
