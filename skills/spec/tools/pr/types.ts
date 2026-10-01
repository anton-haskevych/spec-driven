export const BUCKETS = ["pass", "fail", "pending", "skipping", "cancel"] as const;
export type Bucket = (typeof BUCKETS)[number];

export interface Check {
  name: string;
  bucket: Bucket;
  workflow: string;
  link: string;
}

export interface PrView {
  number: number;
  state: string;
  isDraft: boolean;
  mergeable: string;
  mergeStateStatus: string;
  headRefOid: string;
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
