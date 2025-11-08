-- database/migrations/016_jobs_table.sql
-- ============================================================================
-- Phase 6: Migration 016 - Jobs Table
-- Description: Creates a table to serve as a simple, database-backed job queue.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jobs (
    id BIGSERIAL PRIMARY KEY,
    queue TEXT NOT NULL DEFAULT 'default',
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the job processor to efficiently find pending jobs.
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON public.jobs (queue, status, run_at) WHERE status = 'pending';

-- Apply the `updated_at` trigger
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
