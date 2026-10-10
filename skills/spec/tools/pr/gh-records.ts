import { booleanField, isRecord, numberField, stringField, type FrontmatterData } from "../core/frontmatter";
import { BUCKETS, type Bucket, type Check, type Job, type PrView, type WorkflowRun } from "./checks/types";

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function toPrView(value: unknown): PrView | undefined {
  if (!isRecord(value)) return undefined;
  const number = numberField(value, "number");
  const state = stringField(value, "state");
  if (number === undefined || state === undefined) return undefined;
  return {
    number,
    state,
    isDraft: booleanField(value, "isDraft") ?? false,
    mergeable: stringField(value, "mergeable") ?? "UNKNOWN",
    mergeStateStatus: stringField(value, "mergeStateStatus") ?? "UNKNOWN",
    headRefOid: stringField(value, "headRefOid") ?? "",
  };
}

export function toChecks(value: unknown): Check[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isRecord).map((check) => ({
    name: stringField(check, "name") ?? "(unnamed check)",
    bucket: toBucket(stringField(check, "bucket")),
    workflow: stringField(check, "workflow") ?? "",
    link: stringField(check, "link") ?? "",
  }));
}

export function toJobs(value: unknown): Job[] | undefined {
  const jobs = isRecord(value) ? value.jobs : undefined;
  if (!Array.isArray(jobs)) return undefined;
  return jobs.filter(isRecord).flatMap((job) => {
    const id = numberField(job, "databaseId");
    const name = stringField(job, "name");
    return id === undefined || name === undefined ? [] : [{ id, name, conclusion: stringField(job, "conclusion") ?? "" }];
  });
}

export function toWorkflowId(value: unknown): number | undefined {
  return isRecord(value) ? numberField(value, "workflowDatabaseId") : undefined;
}

export function toWorkflowRuns(value: unknown): WorkflowRun[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isRecord).flatMap((run: FrontmatterData) => {
    const id = numberField(run, "databaseId");
    if (id === undefined) return [];
    return [{ id, conclusion: stringField(run, "conclusion") ?? "", createdAt: stringField(run, "createdAt") ?? "" }];
  });
}

// An unrecognised bucket counts as pending: it must never read as green.
function toBucket(value: string | undefined): Bucket {
  return BUCKETS.find((bucket) => bucket === value) ?? "pending";
}
