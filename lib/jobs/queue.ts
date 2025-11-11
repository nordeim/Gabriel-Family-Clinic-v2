// lib/jobs/queue.ts
"use server";

/**
 * Jobs / Queue subsystem
 *
 * - This module implements an internal job queue on top of the `jobs` table and
 *   the `claim_job()` database function defined in migrations.
 * - It uses a Supabase ADMIN client purely as a database client.
 * - It MUST NOT:
 *   - Depend on Supabase Auth for identity.
 *   - Bypass the canonical NextAuth/Prisma identity for user-facing logic.
 *
 * Jobs are infrastructure-level and must not log PHI or sensitive payloads.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { JobPayloads, JobType, JobRecord } from "./types";

const MAX_ATTEMPTS = 5;

// All job handlers are defined in this map.
// Use specific typed handlers as they are introduced.
const jobHandlers: Record<string, (payload: unknown) => Promise<void>> = {
  // Add handlers here, e.g.:
  // "notifications.email": async (payload) => { ... },
};

export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayloads[T],
  runAt?: Date,
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("jobs").insert({
    queue: type,
    payload,
    run_at: runAt?.toISOString() ?? new Date().toISOString(),
  });

  if (error) {
    // Operational log only; do not log full payloads.
    console.error(`Failed to enqueue job of type "${type}":`, {
      code: error.code,
      message: error.message,
    });
  }
}

export class JobProcessor {
  private supabase = createSupabaseAdminClient();

  public async run() {
    // Atomically claim the next available job.
    const { data: job, error } = await this.supabase
      .rpc("claim_job")
      .single();

    if (error || !job) {
      // PGRST116 = "No rows returned" (no job available); treat silently.
      if (error && error.code !== "PGRST116") {
        console.error("Error claiming job:", {
          code: error.code,
          message: error.message,
        });
      }
      return;
    }

    const jobRecord = job as unknown as JobRecord;
    const handler = jobHandlers[jobRecord.queue as JobType];

    if (!handler) {
      await this.markAsFailed(jobRecord.id, "No handler registered for queue.");
      return;
    }

    try {
      await handler(jobRecord.payload);
      await this.markAsCompleted(jobRecord.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (jobRecord.attempts + 1 >= MAX_ATTEMPTS) {
        await this.markAsFailed(jobRecord.id, message);
      } else {
        await this.retryJob(jobRecord.id, message, jobRecord.attempts);
      }
    }
  }

  private async markAsCompleted(jobId: number) {
    const { error } = await this.supabase
      .from("jobs")
      .update({ status: "completed", last_error: null })
      .eq("id", jobId);

    if (error) {
      console.error("Failed to mark job as completed:", {
        jobId,
        code: error.code,
        message: error.message,
      });
    }
  }

  private async markAsFailed(jobId: number, errorMessage: string) {
    const { error } = await this.supabase
      .from("jobs")
      .update({
        status: "failed",
        last_error: errorMessage,
      })
      .eq("id", jobId);

    if (error) {
      console.error("Failed to mark job as failed:", {
        jobId,
        code: error.code,
        message: error.message,
      });
    }
  }

  private async retryJob(
    jobId: number,
    errorMessage: string,
    currentAttempts?: number,
  ) {
    // Fetch attempts if not provided to compute exponential backoff safely.
    let attempts = currentAttempts;

    if (attempts == null) {
      const { data, error } = await this.supabase
        .from("jobs")
        .select("attempts")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Failed to fetch attempts for retry backoff:", {
          jobId,
          code: error.code,
          message: error.message,
        });
      }

      attempts =
        typeof data?.attempts === "number" && data.attempts >= 0
          ? data.attempts
          : 0;
    }

    // Exponential backoff in minutes; capped implicitly by MAX_ATTEMPTS.
    const backoffSeconds = Math.pow(2, attempts) * 60;
    const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

    const { error: updateError } = await this.supabase
      .from("jobs")
      .update({
        status: "pending",
        last_error: errorMessage,
        run_at: nextRunAt.toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Failed to reschedule job for retry:", {
        jobId,
        code: updateError.code,
        message: updateError.message,
      });
    }
  }
}
