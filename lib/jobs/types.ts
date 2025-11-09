// lib/jobs/types.ts
// Minimal, permissive job typing to satisfy type-checking in queue implementation.
// This is intentionally generic and can be replaced with more specific payloads
// when actual job types are known.

export type JobPayloads = Record<string, unknown>;

// JobType is the set of keys present in JobPayloads. For now, allow any string.
export type JobType = keyof JobPayloads & string;

export interface JobRecord {
  id: number;
  queue: string;
  payload: unknown;
  attempts: number;
  status: "pending" | "completed" | "failed";
  run_at: string;
  last_error?: string | null;
}

// No default export — keep the file focused on type exports only.
