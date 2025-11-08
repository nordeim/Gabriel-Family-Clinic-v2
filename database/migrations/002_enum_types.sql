-- database/migrations/002_enum_types.sql

-- ============================================================================
-- Phase 1: Migration 002 - ENUM Types
-- Description: Defines all custom ENUM types for consistent, constrained values.
-- ============================================================================

-- Using DO blocks to create types only if they don't already exist,
-- ensuring this script is idempotent.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'patient',
            'doctor',
            'nurse',
            'staff',
            'admin',
            'superadmin'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE public.appointment_status AS ENUM (
            'scheduled',
            'confirmed',
            'in_progress',
            'completed',
            'cancelled',
            'no_show',
            'rescheduled'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM (
            'pending',
            'processing',
            'completed',
            'failed',
            'refunded',
            'partial'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE public.gender AS ENUM (
            'male',
            'female',
            'other',
            'prefer_not_to_say'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chas_card_type') THEN
        CREATE TYPE public.chas_card_type AS ENUM (
            'blue',
            'orange',
            'green',
            'none'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE public.notification_channel AS ENUM (
            'email',
            'sms',
            'whatsapp',
            'push',
            'in_app'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
        CREATE TYPE public.queue_status AS ENUM (
            'waiting',
            'called',
            'serving',
            'completed',
            'cancelled'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE public.document_type AS ENUM (
            'lab_result',
            'xray',
            'scan',
            'report',
            'prescription',
            'mc',
            'referral',
            'other'
        );
    END IF;
    -- From Enhancement-3.md, ensuring consistency
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_status') THEN
        CREATE TYPE public.webhook_event_status AS ENUM (
            'pending',
            'processing',
            'success',
            'failed',
            'dead_letter'
        );
    END IF;
END $$;
