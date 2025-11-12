-- database/migrations/004_core_clinical_tables.sql

-- ============================================================================
-- Phase 1: Migration 004 - Core Clinical Tables (Patients, Doctors, Staff)
-- Description: Creates tables for clinical roles and patient records.
-- NOTE: Written to be safely re-runnable (idempotent) for local/CI validation.
-- ============================================================================

SET search_path TO clinic, public;

-- Patients table: Holds demographic, medical, and insurance information for patients.
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_number VARCHAR(50) UNIQUE NOT NULL,
    nric_encrypted TEXT,
    nric_hash VARCHAR(64),
    passport_number_encrypted TEXT,
    date_of_birth DATE NOT NULL,
    gender gender NOT NULL,
    nationality VARCHAR(100) DEFAULT 'Singaporean',
    race VARCHAR(50),
    marital_status VARCHAR(20),
    occupation VARCHAR(100),
    employer VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(10),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    blood_type VARCHAR(10),
    allergies JSONB DEFAULT '[]',
    chronic_conditions JSONB DEFAULT '[]',
    current_medications JSONB DEFAULT '[]',
    medical_history JSONB DEFAULT '[]',
    family_medical_history JSONB DEFAULT '[]',
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    bmi DECIMAL(4,2),
    chas_card_type chas_card_type DEFAULT 'none',
    chas_card_number_encrypted TEXT,
    chas_card_expiry DATE,
    insurance_provider VARCHAR(255),
    insurance_policy_number_encrypted TEXT,
    insurance_expiry DATE,
    medisave_authorized BOOLEAN DEFAULT false,
    preferred_doctor_id UUID, -- No FK here yet to avoid circular dependency
    preferred_language VARCHAR(5) DEFAULT 'en',
    sms_consent BOOLEAN DEFAULT false,
    email_consent BOOLEAN DEFAULT false,
    whatsapp_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    data_sharing_consent BOOLEAN DEFAULT false,
    consent_updated_at TIMESTAMPTZ,
    first_visit_date DATE,
    last_visit_date DATE,
    total_visits INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    risk_factors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT unique_nric_hash_per_clinic UNIQUE(clinic_id, nric_hash),
    CONSTRAINT valid_emergency_phone CHECK (
        emergency_contact_phone IS NULL
        OR emergency_contact_phone ~ '^[+0-9][0-9\\s-]+$'
    )
);

-- Doctors table: Holds professional information for medical doctors.
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    medical_registration_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    specializations JSONB DEFAULT '[]',
    qualifications JSONB DEFAULT '[]',
    languages_spoken JSONB DEFAULT '["English"]',
    years_of_experience INTEGER,
    consultation_fee DECIMAL(10,2),
    telemedicine_enabled BOOLEAN DEFAULT false,
    telemedicine_fee DECIMAL(10,2),
    consultation_duration_minutes INTEGER DEFAULT 15,
    buffer_time_minutes INTEGER DEFAULT 0,
    max_daily_appointments INTEGER DEFAULT 40,
    advance_booking_days INTEGER DEFAULT 30,
    working_hours JSONB DEFAULT '{}',
    break_times JSONB DEFAULT '[]',
    blocked_dates JSONB DEFAULT '[]',
    auto_accept_appointments BOOLEAN DEFAULT true,
    signature_image_url TEXT,
    profile_photo_url TEXT,
    bio TEXT,
    total_consultations INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_consultation_fee CHECK (consultation_fee >= 0),
    CONSTRAINT valid_rating CHECK (
        average_rating IS NULL
        OR (average_rating >= 0 AND average_rating <= 5)
    )
);

-- Add the missing FK from patients to doctors now that doctors table exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_patients_preferred_doctor'
    ) THEN
        ALTER TABLE patients
            ADD CONSTRAINT fk_patients_preferred_doctor
            FOREIGN KEY (preferred_doctor_id)
            REFERENCES doctors(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

-- Staff table: For non-clinical staff like receptionists and admins.
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    reporting_to UUID REFERENCES staff(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{}',
    accessible_modules JSONB DEFAULT '[]',
    employment_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Apply the `updated_at` trigger (idempotent for each table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_patients_updated_at'
    ) THEN
        CREATE TRIGGER update_patients_updated_at
            BEFORE UPDATE ON patients
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_doctors_updated_at'
    ) THEN
        CREATE TRIGGER update_doctors_updated_at
            BEFORE UPDATE ON doctors
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at'
    ) THEN
        CREATE TRIGGER update_staff_updated_at
            BEFORE UPDATE ON staff
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END;
$$;
