-- database/migrations/014_webhook_helpers.sql

-- ============================================================================
-- Phase 2: Migration 014 - Webhook Processing Helpers
-- Description: Implements helper functions for the webhook processing
--              state machine from Sprint 3 plan.
-- ============================================================================

SET search_path TO webhook, clinic, public;

-- 1. Helper function to atomically claim the next available webhook event.
-- This prevents multiple workers from processing the same event concurrently.
CREATE OR REPLACE FUNCTION webhook.claim_next_event(p_worker_id TEXT, p_batch_size INT DEFAULT 1)
RETURNS TABLE(like clinic.webhook_events) AS $$
BEGIN
  RETURN QUERY
  WITH next_events AS (
    SELECT id
    FROM clinic.webhook_events
    WHERE status = 'pending'
    ORDER BY received_at
    FOR UPDATE SKIP LOCKED -- The magic: skips rows currently locked by other transactions
    LIMIT p_batch_size
  )
  UPDATE clinic.webhook_events we
  SET
    status = 'processing',
    last_attempt_at = now(),
    attempts = we.attempts + 1
  FROM next_events
  WHERE we.id = next_events.id
  RETURNING we.*;
END;
$$ LANGUAGE plpgsql;


-- 2. Helper function to mark the processing result of an event.
-- This encapsulates the logic for success, failure, or dead-lettering.
CREATE OR REPLACE FUNCTION webhook.mark_event_result(
    p_event_id UUID,
    p_status webhook_event_status,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_processed_at TIMESTAMPTZ := NULL;
BEGIN
    IF p_status = 'success' THEN
        v_processed_at := now();
    END IF;

    UPDATE clinic.webhook_events
    SET
        status = p_status,
        error = p_error_message,
        processed_at = v_processed_at,
        last_attempt_at = now()
    WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;
