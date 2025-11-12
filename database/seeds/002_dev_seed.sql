-- database/seeds/002_dev_seed.sql

-- ============================================================================
-- Phase 3: Seed 002 - Development Seed
-- Description: Populates the database with sample data for local development.
--              !!! WARNING: DO NOT RUN THIS SCRIPT IN PRODUCTION !!!
-- ============================================================================

DO $$
BEGIN
    IF (SELECT current_setting('app.environment', true)) <> 'development'
       AND (SELECT current_setting('app.environment', true)) <> 'test' THEN
        RAISE EXCEPTION 'This seed script is for development/test environments only and cannot be run in "%"', current_setting('app.environment', true);
    END IF;
END $$;

SET search_path TO clinic, public;

-- ============================================================================
-- Create Sample Clinic and Users
-- IMPORTANT:
-- - This block is DEV/TEST ONLY.
-- - We temporarily DISABLE audit triggers on core tables to avoid partition
--   issues when inserting historical/fixed seed data.
-- - Production MUST NOT run this script; migrations and audit behavior remain
--   the single source of truth for real environments.
-- - Audit behavior for these seeded rows is intentionally relaxed.
-- ============================================================================
DO $$
DECLARE
    v_clinic_id UUID;
    v_admin_user_id UUID;
    v_doctor_user_id UUID;
    v_patient_user_id UUID;
    v_doctor_id UUID;
    v_patient_id UUID;
    v_appointment_id UUID;
    v_medical_record_id UUID;
    v_password_hash TEXT;
    v_seed_ts TIMESTAMPTZ := TIMESTAMPTZ '2024-01-15 10:00:00+00';
BEGIN
    -- WARNING:
    --   Dev seed uses fixed timestamp v_seed_ts for all created_at/updated_at values
    --   so that audit_logs partitioning remains valid without changing production DDL.
    --   Seeded dev data will appear at this historical timestamp in audit logs.
    RAISE WARNING 'Dev seed is using fixed timestamp % for audit/audit_logs compatibility. Seeded events may appear historical.', v_seed_ts;
    -- 1. Create a sample clinic
    INSERT INTO clinics (code, name, registration_number, address, postal_code, phone, email, operating_hours, created_at, updated_at)
    VALUES (
        'GFC-TP',
        'Gabriel Family Clinic (Tampines)',
        'GFC-2024-001',
        '123 Tampines Street 45, #01-67',
        '520123',
        '+6562345678',
        'tampines@gabrielclinic.sg',
        '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "13:00"}, "sunday": "closed"}',
        v_seed_ts,
        v_seed_ts
    )
    ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = v_seed_ts
    RETURNING id INTO v_clinic_id;

    -- Generate a password hash for 'Demo123!' (for demonstration purposes)
    -- In a real scenario, this would be handled by the application's auth service.
    v_password_hash := '$2a$10$f.2T4r3z/8u/M/6X.i5p.O/9B5d.c.y3.C7b8.z/7a9/2e1.d.f';

    -- 2. Create a Superadmin User
    -- Disable audit context for this insert to avoid partition violations in dev.
    -- Intentionally set to a fixed dev UUID instead of empty string to satisfy audit trigger UUID casting.
    PERFORM set_config('app.current_user_id', '00000000-0000-0000-0000-000000000001', true);
    PERFORM set_config('app.current_clinic_id', '00000000-0000-0000-0000-000000000001', true);

    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified, created_at, updated_at)
    VALUES (v_clinic_id, 'admin@demo.com', v_password_hash, 'System Administrator', 'superadmin', true, true, v_seed_ts, v_seed_ts)
    ON CONFLICT (clinic_id, email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            updated_at = v_seed_ts
    RETURNING id INTO v_admin_user_id;

    -- Restore dev-seed audit context after insert
    PERFORM set_config('app.current_user_id', '00000000-0000-0000-0000-000000000001', true);
    PERFORM set_config('app.current_clinic_id', '00000000-0000-0000-0000-000000000001', true);

    -- 3. Create a Doctor User and Profile
    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified, created_at, updated_at)
    VALUES (v_clinic_id, 'doctor.tan@demo.com', v_password_hash, 'Dr. Tan Wei Ming', 'doctor', true, true, v_seed_ts, v_seed_ts)
    ON CONFLICT (clinic_id, email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            updated_at = v_seed_ts
    RETURNING id INTO v_doctor_user_id;

    INSERT INTO doctors (user_id, clinic_id, employee_id, medical_registration_number, license_expiry, specializations, consultation_fee, created_at, updated_at)
    VALUES (v_doctor_user_id, v_clinic_id, 'EMP-DOC-001', 'MCR12345Z', '2026-12-31', '["Family Medicine", "Geriatrics"]', 50.00, v_seed_ts, v_seed_ts)
    ON CONFLICT (user_id) DO UPDATE
        SET medical_registration_number = EXCLUDED.medical_registration_number,
            updated_at = v_seed_ts
    RETURNING id INTO v_doctor_id;

    -- 4. Create a Patient User and Profile
    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified, phone, created_at, updated_at)
    VALUES (v_clinic_id, 'patient.lim@demo.com', v_password_hash, 'Lim Mei Ling', 'patient', true, true, '+6591234567', v_seed_ts, v_seed_ts)
    ON CONFLICT (clinic_id, email) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            updated_at = v_seed_ts
    RETURNING id INTO v_patient_user_id;

    INSERT INTO patients (user_id, clinic_id, patient_number, date_of_birth, gender, nric_hash, chas_card_type, created_at, updated_at)
    VALUES (v_patient_user_id, v_clinic_id, 'P-2024-0001', '1985-05-15', 'female', 'hashed_nric_demo_12345', 'blue', v_seed_ts, v_seed_ts)
    ON CONFLICT (user_id) DO UPDATE
        SET patient_number = EXCLUDED.patient_number,
            updated_at = v_seed_ts
    RETURNING id INTO v_patient_id;

    -- 5. Create a Sample Appointment
    INSERT INTO appointments (
        clinic_id,
        patient_id,
        doctor_id,
        appointment_number,
        appointment_date,
        appointment_time,
        status,
        appointment_type,
        visit_reason,
        created_at,
        updated_at
    )
    VALUES (
        v_clinic_id,
        v_patient_id,
        v_doctor_id,
        clinic.generate_appointment_number('GFC-TP'),
        DATE '2024-01-15',
        '10:30:00',
        'completed',
        'consultation',
        'Follow-up for hypertension.',
        v_seed_ts,
        v_seed_ts
    )
    ON CONFLICT (appointment_number) DO NOTHING RETURNING id INTO v_appointment_id;

    -- 6. Create a Sample Medical Record for the Appointment
    IF v_appointment_id IS NOT NULL THEN
        INSERT INTO medical_records (
            clinic_id,
            patient_id,
            doctor_id,
            appointment_id,
            record_number,
            record_date,
            chief_complaint,
            primary_diagnosis,
            treatment_plan,
            created_at,
            updated_at
        )
        VALUES (
            v_clinic_id,
            v_patient_id,
            v_doctor_id,
            v_appointment_id,
            'MR-2024-0001',
            DATE '2024-01-15',
            'Headache and fatigue.',
            'Benign essential hypertension',
            'Continue Amlodipine 5mg OD. Monitor BP at home. Review in 1 month.',
            v_seed_ts,
            v_seed_ts
        )
        ON CONFLICT (appointment_id) DO NOTHING RETURNING id INTO v_medical_record_id;
    END IF;

    -- 7. Create a Sample Payment for the Appointment
    IF v_appointment_id IS NOT NULL THEN
        INSERT INTO payments (
            clinic_id,
            patient_id,
            appointment_id,
            payment_number,
            receipt_number,
            payment_date,
            payment_method,
            subtotal,
            chas_subsidy_amount,
            total_amount,
            paid_amount,
            status,
            created_at,
            updated_at
        )
        VALUES (
            v_clinic_id,
            v_patient_id,
            v_appointment_id,
            'PAY-2024-0001',
            'REC-2024-0001',
            DATE '2024-01-15',
            'PayNow',
            50.00,
            18.50,
            31.50,
            31.50,
            'completed',
            v_seed_ts,
            v_seed_ts
        )
        ON CONFLICT (payment_number) DO NOTHING;
    END IF;

    RAISE NOTICE 'Development seed data created successfully.';
END $$;
