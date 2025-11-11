-- database/migrations/018_feedback_table.sql
-- ============================================================================
-- Phase 10: Migration 018 - User Feedback Table
-- Description: Creates a table to store feedback submitted via the in-app widget.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Align with core identity model: users table lives in the `clinic` schema.
    -- We keep this in `public` schema as a cross-cutting table, but reference clinic.users.
    user_id UUID REFERENCES clinic.users(id) ON DELETE SET NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying feedback by user or over time.
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at);
