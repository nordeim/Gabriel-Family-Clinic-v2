-- database/migrations/009_system_and_integration_tables.sql

-- ============================================================================
-- Phase 1: Migration 009 - System & Integration Tables
-- Description: Creates tables for system settings, feature flags, and integrations.
-- ============================================================================

SET search_path TO clinic, public;

-- Telemedicine sessions table: Records details of each video consultation.
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    room_url TEXT,
    room_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'scheduled',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    duration_minutes INTEGER,
    patient_joined_at TIMESTAMPTZ,
    patient_left_at TIMESTAMPTZ,
    doctor_joined_at TIMESTAMPTZ,
    doctor_left_at TIMESTAMPTZ,
    connection_drops INTEGER DEFAULT 0,
    recording_enabled BOOLEAN DEFAULT false,
    recording_url TEXT,
    patient_rating INTEGER,
    patient_feedback TEXT,
    doctor_notes TEXT,
    technical_issues TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- System settings table: A key-value store for application configuration.
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE, -- NULL for global settings
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),

    CONSTRAINT unique_setting UNIQUE(clinic_id, category, key)
);

-- Feature flags table: For enabling/disabling features without deployment.
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0,
    enabled_for_clinics JSONB DEFAULT '[]',
    enabled_for_users JSONB DEFAULT '[]',
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_rollout CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- Integration webhooks table: For configuring outbound webhooks to other systems.
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    events JSONB NOT NULL DEFAULT '[]', -- e.g., ["appointment.created", "payment.completed"]
    headers JSONB DEFAULT '{}',
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    last_triggered_at TIMESTAMPTZ,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Webhook logs table: Logs for outgoing webhook attempts.
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES integration_webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events table: For ingesting and processing INCOMING webhooks (from Stripe, Twilio, etc.)
-- This is based on the superior design from Enhancement-1.md and Enhancement-3.md
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID, -- Optional FK to a table defining webhook sources
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB NOT NULL,
  signature TEXT,
  status webhook_event_status NOT NULL DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error TEXT,
  idempotency_key TEXT,
  created_by UUID,
  UNIQUE (webhook_id, event_id)
);


-- Apply the `updated_at` trigger (idempotent for each table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_telemedicine_sessions_updated_at'
    ) THEN
        CREATE TRIGGER update_telemedicine_sessions_updated_at
            BEFORE UPDATE ON telemedicine_sessions
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_system_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_system_settings_updated_at
            BEFORE UPDATE ON system_settings
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_feature_flags_updated_at'
    ) THEN
        CREATE TRIGGER update_feature_flags_updated_at
            BEFORE UPDATE ON feature_flags
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_integration_webhooks_updated_at'
    ) THEN
        CREATE TRIGGER update_integration_webhooks_updated_at
            BEFORE UPDATE ON integration_webhooks
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END;
$$;
