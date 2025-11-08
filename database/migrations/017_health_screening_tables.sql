-- database/migrations/017_health_screening_tables.sql
-- ============================================================================
-- Phase 7: Migration 017 - Health Screening Tables
-- Description: Adds tables for managing health screening packages and results.
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinic.health_screening_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinic.clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    tests_included JSONB DEFAULT '[]', -- e.g., ["Fasting Glucose", "Lipid Panel"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic.health_screening_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES clinic.patients(id) ON DELETE CASCADE,
    package_id UUID REFERENCES clinic.health_screening_packages(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES clinic.appointments(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    doctor_notes TEXT,
    results JSONB NOT NULL, -- e.g., [{"test": "Fasting Glucose", "value": "5.2", "unit": "mmol/L", "range": "3.9-5.5"}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_screening_results_patient ON clinic.health_screening_results(patient_id);
