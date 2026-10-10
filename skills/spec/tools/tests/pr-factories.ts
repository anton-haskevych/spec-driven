import type { Check, PrView } from "../pr/checks/types";

export function prView({ checks = [], ...overrides }: Partial<PrView> = {}): PrView {
  return {
    number: 875,
    state: "OPEN",
    isDraft: false,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    headRefOid: "08bb7dbd47fa14537ef4",
    headRefName: "feat/billing-pr-a",
    url: "https://github.com/acme/app/pull/875",
    checks,
    ...overrides,
  };
}

// What `gh pr view --json` prints for this view: checks as statusCheckRollup rows, mergeCommit as { oid }.
export function ghPrViewJson(overrides: Partial<PrView> = {}): string {
  const { checks, mergeCommit, ...view } = prView(overrides);
  return JSON.stringify({ ...view, statusCheckRollup: checks.map(rollupRow), ...(mergeCommit ? { mergeCommit: { oid: mergeCommit } } : {}) });
}

function rollupRow(row: Check): object {
  const status = row.bucket === "running" ? "IN_PROGRESS" : row.bucket === "queued" ? "QUEUED" : "COMPLETED";
  const conclusion = { pass: "SUCCESS", fail: "FAILURE", skipping: "SKIPPED", cancel: "CANCELLED", running: "", queued: "" }[row.bucket];
  return { __typename: "CheckRun", name: row.name, workflowName: row.workflow, status, conclusion, startedAt: row.startedAt ?? "", completedAt: row.completedAt ?? "", detailsUrl: row.link };
}

export function check(overrides: Partial<Check> = {}): Check {
  return { name: "Backend Tests", bucket: "pass", workflow: "CI", link: "", ...overrides };
}

export interface PhaseSketch {
  id: string;
  title: string;
  pr?: string;
  outcome?: string;
  code?: false;
}

// A spec's progress.md and phase files, enough for PR groups, titles and Outcome lines.
export function phasedSpecFiles(phases: readonly PhaseSketch[]): Record<string, string> {
  const pointer = (phase: PhaseSketch) => `phases/phase-${phase.id}.md`;
  const progress = phases.map((phase) => `- [ ] Phase ${phase.id} — ${phase.title} → \`${pointer(phase)}\``).join("\n");
  const entries = phases.map((phase) => {
    const edges = [`needs: []`, ...(phase.pr ? [`pr: ${phase.pr}`] : []), ...(phase.code === false ? ["code: false"] : [])];
    const outcome = phase.outcome ? `**Outcome:** ${phase.outcome}\n\n` : "";
    return [pointer(phase), `---\n${edges.join("\n")}\n---\n\n# Phase ${phase.id} — ${phase.title}\n\n**Goal:** Build ${phase.title}.\n\n${outcome}## Deliverables\n\n- [ ] it\n`] as const;
  });
  return { "progress.md": `# Progress\n\n## Phases\n\n${progress}\n`, ...Object.fromEntries(entries) };
}
