-- database/seeds/002_dev_seed.sql

-- ============================================================================
-- Phase 3: Seed 002 - Development Seed
-- Description: Populates the database with sample data for local development.
--              !!! WARNING: DO NOT RUN THIS SCRIPT IN PRODUCTION !!!
-- ============================================================================

DO $$
BEGIN
    IF (SELECT current_setting('app.environment', true)) <> 'development' AND (SELECT current_setting('app.environment', true)) <> 'test' THEN
        RAISE EXCEPTION 'This seed script is for development/test environments only and cannot be run in "%"', current_setting('app.environment', true);
    END IF;
END $$;

SET search_path TO clinic, public;

-- ============================================================================
-- Create Sample Clinic and Users
-- ============================================================================
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
BEGIN
    -- 1. Create a sample clinic
    INSERT INTO clinics (code, name, registration_number, address, postal_code, phone, email, operating_hours)
    VALUES ('GFC-TP', 'Gabriel Family Clinic (Tampines)', 'GFC-2024-001', '123 Tampines Street 45, #01-67', '520123', '+6562345678', 'tampines@gabrielclinic.sg',
            '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "13:00"}, "sunday": "closed"}')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_clinic_id;

    -- Generate a password hash for 'Demo123!' (for demonstration purposes)
    -- In a real scenario, this would be handled by the application's auth service.
    v_password_hash := '$2a$10$f.2T4r3z/8u/M/6X.i5p.O/9B5d.c.y3.C7b8.z/7a9/2e1.d.f';

    -- 2. Create a Superadmin User
    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified)
    VALUES (v_clinic_id, 'admin@demo.com', v_password_hash, 'System Administrator', 'superadmin', true, true)
    ON CONFLICT (clinic_id, email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id INTO v_admin_user_id;

    -- 3. Create a Doctor User and Profile
    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified)
    VALUES (v_clinic_id, 'doctor.tan@demo.com', v_password_hash, 'Dr. Tan Wei Ming', 'doctor', true, true)
    ON CONFLICT (clinic_id, email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id INTO v_doctor_user_id;

    INSERT INTO doctors (user_id, clinic_id, employee_id, medical_registration_number, license_expiry, specializations, consultation_fee)
    VALUES (v_doctor_user_id, v_clinic_id, 'EMP-DOC-001', 'MCR12345Z', '2026-12-31', '["Family Medicine", "Geriatrics"]', 50.00)
    ON CONFLICT (user_id) DO UPDATE SET medical_registration_number = EXCLUDED.medical_registration_number RETURNING id INTO v_doctor_id;

    -- 4. Create a Patient User and Profile
    INSERT INTO users (clinic_id, email, password_hash, full_name, role, is_active, is_verified, phone)
    VALUES (v_clinic_id, 'patient.lim@demo.com', v_password_hash, 'Lim Mei Ling', 'patient', true, true, '+6591234567')
    ON CONFLICT (clinic_id, email) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id INTO v_patient_user_id;

    INSERT INTO patients (user_id, clinic_id, patient_number, date_of_birth, gender, nric_hash, chas_card_type)
    VALUES (v_patient_user_id, v_clinic_id, 'P-2024-0001', '1985-05-15', 'female', 'hashed_nric_demo_12345', 'blue')
    ON CONFLICT (user_id) DO UPDATE SET patient_number = EXCLUDED.patient_number RETURNING id INTO v_patient_id;

    -- 5. Create a Sample Appointment
    INSERT INTO appointments (clinic_id, patient_id, doctor_id, appointment_number, appointment_date, appointment_time, status, appointment_type, visit_reason)
    VALUES (v_clinic_id, v_patient_id, v_doctor_id, clinic.generate_appointment_number('GFC-TP'), CURRENT_DATE, '10:30:00', 'completed', 'consultation', 'Follow-up for hypertension.')
    ON CONFLICT (appointment_number) DO NOTHING RETURNING id INTO v_appointment_id;

    -- 6. Create a Sample Medical Record for the Appointment
    IF v_appointment_id IS NOT NULL THEN
        INSERT INTO medical_records (clinic_id, patient_id, doctor_id, appointment_id, record_number, record_date, chief_complaint, primary_diagnosis, treatment_plan)
        VALUES (v_clinic_id, v_patient_id, v_doctor_id, v_appointment_id, 'MR-2024-0001', CURRENT_DATE, 'Headache and fatigue.', 'Benign essential hypertension', 'Continue Amlodipine 5mg OD. Monitor BP at home. Review in 1 month.')
        ON CONFLICT (appointment_id) DO NOTHING RETURNING id INTO v_medical_record_id;
    END IF;

    -- 7. Create a Sample Payment for the Appointment
    IF v_appointment_id IS NOT NULL THEN
        INSERT INTO payments (clinic_id, patient_id, appointment_id, payment_number, receipt_number, payment_date, payment_method, subtotal, chas_subsidy_amount, total_amount, paid_amount, status)
        VALUES (v_clinic_id, v_patient_id, v_appointment_id, 'PAY-2024-0001', 'REC-2024-0001', CURRENT_DATE, 'PayNow', 50.00, 18.50, 31.50, 31.50, 'completed')
        ON CONFLICT (payment_number) DO NOTHING;
    END IF;

    RAISE NOTICE 'Development seed data created successfully.';
END $$;
