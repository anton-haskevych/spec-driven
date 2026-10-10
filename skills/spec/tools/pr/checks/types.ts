export const BUCKETS = ["pass", "fail", "queued", "running", "skipping", "cancel"] as const;
export type Bucket = (typeof BUCKETS)[number];

export interface Check {
  name: string;
  bucket: Bucket;
  workflow: string;
  link: string;
  startedAt?: string;
  completedAt?: string;
  runId?: number;
  jobId?: number;
}

export interface PrView {
  number: number;
  state: string;
  isDraft: boolean;
  mergeable: string;
  mergeStateStatus: string;
  headRefOid: string;
  url: string;
  checks: Check[];
}

export interface Job {
  name: string;
  id: number;
  conclusion: string;
}

export interface WorkflowRun {
  id: number;
  conclusion: string;
  createdAt: string;
}

export interface CommitRun {
  id: number;
  status: string;
  conclusion: string;
}
